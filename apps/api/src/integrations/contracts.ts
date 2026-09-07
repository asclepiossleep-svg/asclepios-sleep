export type SumLinkState =
  | "ABSENT"
  | "PRESENT"
  | "WIRED"
  | "EXERCISED"
  | "MONITORED"
  | "RECOVERABLE"
  | "OPERATIONAL"
  | "DEGRADED"
  | "FAILED"
  | "RECOVERING"
  | "UNKNOWN";

export type SumSeverity = "P0" | "P1" | "P2";

export type IntegrationErrorClass =
  | "AUTH"
  | "VALIDATION"
  | "TIMEOUT"
  | "RATE_LIMIT"
  | "PROVIDER_5XX"
  | "INVARIANT"
  | "DEPENDENCY"
  | "UNKNOWN";

export interface CanonicalEvent<TPayload = Record<string, unknown>> {
  eventId: string;
  eventType: string;
  occurredAt: string;
  receivedAt: string;
  source: string;
  environment: "development" | "staging" | "production";
  correlationId: string;
  causationId?: string;
  schemaVersion: number;
  canonicalObjectType?: string;
  canonicalObjectId?: string;
  providerEventId?: string;
  providerObjectId?: string;
  payload: TPayload;
}

export interface ProviderIdentity {
  provider: string;
  environment: string;
  accountRef?: string;
  projectRef?: string;
}

export interface ProviderHealth {
  identity: ProviderIdentity;
  state: SumLinkState;
  checkedAt: string;
  latencyMs?: number;
  message?: string;
  dependencyStates?: Record<string, SumLinkState>;
}

export interface IntegrationFailure {
  incidentId: string;
  correlationId: string;
  linkName: string;
  provider: string;
  severity: SumSeverity;
  errorClass: IntegrationErrorClass;
  retryable: boolean;
  attemptCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  nextRetryAt?: string;
  canonicalObjectIds?: string[];
  providerRefs?: string[];
  safeMessage: string;
}

export interface ReconciliationResult {
  provider: string;
  startedAt: string;
  finishedAt: string;
  inspected: number;
  matched: number;
  mismatched: number;
  repaired: number;
  unresolved: number;
  exceptionIds: string[];
}

export interface ProviderAdapter<TCommand = unknown, TResult = unknown> {
  identify(): Promise<ProviderIdentity>;
  health(): Promise<ProviderHealth>;
  execute(command: TCommand, idempotencyKey: string): Promise<TResult>;
  reconcile(from: Date, to: Date): Promise<ReconciliationResult>;
}

export interface InboundEventAdapter<TPayload = Record<string, unknown>> {
  verifySignature(rawBody: string | Buffer, headers: Record<string, string | string[] | undefined>): Promise<boolean>;
  normalize(rawBody: string | Buffer, headers: Record<string, string | string[] | undefined>): Promise<CanonicalEvent<TPayload>>;
  dedupeKey(event: CanonicalEvent<TPayload>): string;
}

export const SUM_TRANSIENT_RETRY_MINUTES = [1, 5, 15, 60, 360] as const;
