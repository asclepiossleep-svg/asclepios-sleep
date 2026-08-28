import { Router } from "express";
import { prisma } from "../db";
import { requireAuth, AuthedRequest } from "../middleware/auth";
import { getNextQuestion, submitAnswer, routeIntent } from "../domain/questionEngine";

const router = Router();
router.use(requireAuth);

// Doc 02 §2 step 1 — Intent Router. Button path only in V1 (0 AI).
router.post("/intent", async (req: AuthedRequest, res) => {
  const { buttonIntent, freeText } = req.body as { buttonIntent?: string; freeText?: string };
  const intent = routeIntent(buttonIntent as any, freeText);
  res.json({ intent });
});

router.post("/start", async (req: AuthedRequest, res) => {
  const { type } = req.body as { type?: "INITIAL" | "TWENTY_EIGHT_DAY_REASSESSMENT" };
  const assessment = await prisma.assessment.create({ data: { userId: req.userId!, type: type ?? "INITIAL" } });
  res.json(assessment);
});

router.get("/:id/next", async (req: AuthedRequest, res) => {
  const assessment = await prisma.assessment.findFirst({ where: { id: req.params.id, userId: req.userId! } });
  if (!assessment) return res.status(404).json({ error: "not_found" });
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.userId! } });

  const question = await getNextQuestion(req.userId!, assessment.id, user.locale);
  if (!question) {
    if (!assessment.completedAt) {
      await prisma.assessment.update({ where: { id: assessment.id }, data: { completedAt: new Date() } });
    }
    return res.json({ done: true });
  }
  res.json({ done: false, question });
});

router.post("/:id/answer", async (req: AuthedRequest, res) => {
  const assessment = await prisma.assessment.findFirst({ where: { id: req.params.id, userId: req.userId! } });
  if (!assessment) return res.status(404).json({ error: "not_found" });

  const { questionId, answerOptionId } = req.body as { questionId: string; answerOptionId: string };
  const answer = await submitAnswer(req.userId!, assessment.id, questionId, answerOptionId);
  res.json(answer);
});

export default router;
