import type { CalculationResult, CalculationRule, EntityId, FieldValue } from "../../domain/src/index.js";

export interface CalculationSubject {
  type: string;
  id: EntityId;
}

export interface CalculationContext {
  revisionId: EntityId;
  now: string;
  fields: ReadonlyMap<string, FieldValue<unknown>>;
  previousResults: ReadonlyMap<string, CalculationResult>;
  subject?: CalculationSubject;
}

export type RuleEvaluator = (context: CalculationContext) => number | string;

export interface ExecutableCalculationRule extends CalculationRule {
  evaluate?: RuleEvaluator;
}

export interface CalculationEngine {
  register(rule: ExecutableCalculationRule): void;
  calculate(ruleCode: string, context: CalculationContext): CalculationResult;
  getRule(ruleCode: string): ExecutableCalculationRule | undefined;
  listRules(): readonly ExecutableCalculationRule[];
}

export class RuleNotValidatedError extends Error {
  constructor(ruleCode: string) {
    super(`A regra ${ruleCode} ainda não foi validada para execução.`);
    this.name = "RuleNotValidatedError";
  }
}

export class MissingCalculationFieldError extends Error {
  constructor(ruleCode: string, fieldKey: string) {
    super(`A regra ${ruleCode} requer o campo ${fieldKey}.`);
    this.name = "MissingCalculationFieldError";
  }
}

export class InvalidCalculationResultError extends Error {
  constructor(ruleCode: string) {
    super(`A regra ${ruleCode} produziu um resultado numérico inválido.`);
    this.name = "InvalidCalculationResultError";
  }
}

export function requireField<T>(context: CalculationContext, ruleCode: string, key: string): FieldValue<T> {
  const field = context.fields.get(key);
  if (!field) throw new MissingCalculationFieldError(ruleCode, key);
  return field as FieldValue<T>;
}

export function requireNumber(context: CalculationContext, ruleCode: string, key: string): number {
  const field = requireField<unknown>(context, ruleCode, key);
  if (typeof field.value !== "number" || !Number.isFinite(field.value)) throw new MissingCalculationFieldError(ruleCode, key);
  return field.value;
}

export function requireNumberArray(context: CalculationContext, ruleCode: string, key: string): readonly number[] {
  const field = requireField<unknown>(context, ruleCode, key);
  if (!Array.isArray(field.value) || field.value.some((value) => typeof value !== "number" || !Number.isFinite(value))) throw new MissingCalculationFieldError(ruleCode, key);
  return field.value as number[];
}

export class VersionedCalculationEngine implements CalculationEngine {
  private readonly rules = new Map<string, ExecutableCalculationRule>();

  register(rule: ExecutableCalculationRule): void {
    const current = this.rules.get(rule.code);
    if (!current || rule.version >= current.version) this.rules.set(rule.code, rule);
  }

  getRule(ruleCode: string): ExecutableCalculationRule | undefined {
    return this.rules.get(ruleCode);
  }

  listRules(): readonly ExecutableCalculationRule[] {
    return [...this.rules.values()].sort((left, right) => left.category.localeCompare(right.category) || left.name.localeCompare(right.name));
  }

  calculate(ruleCode: string, context: CalculationContext): CalculationResult {
    const rule = this.rules.get(ruleCode);
    if (!rule) throw new Error(`Regra não registrada: ${ruleCode}.`);
    if (rule.validationStatus !== "validated" || !rule.evaluate) throw new RuleNotValidatedError(ruleCode);
    for (const inputKey of rule.inputKeys) requireField(context, ruleCode, inputKey);

    const value = rule.evaluate(context);
    if (typeof value === "number" && !Number.isFinite(value)) throw new InvalidCalculationResultError(ruleCode);
    const subject = context.subject ?? { type: "revision", id: context.revisionId };
    const audit = { createdAt: context.now, createdBy: "calculation-engine", updatedAt: context.now, updatedBy: "calculation-engine" };

    return {
      ...audit,
      id: `${context.revisionId}:${rule.code}:v${rule.version}:${subject.type}:${subject.id}`,
      revisionId: context.revisionId,
      calculationRuleId: rule.id,
      subjectType: subject.type,
      subjectId: subject.id,
      ...(typeof value === "number" ? { numericValue: value } : { textValue: value }),
      unit: rule.unit,
      origin: "CALCULATED",
      calculatedAt: context.now,
      sourceUpdatedAt: latestSourceDate(context.fields),
      isFallback: [...context.fields.values()].some((field) => field.fallback),
    };
  }
}

function latestSourceDate(fields: ReadonlyMap<string, FieldValue<unknown>>): string | undefined {
  return [...fields.values()].map((field) => field.sourceUpdatedAt).filter((value): value is string => Boolean(value)).sort().at(-1);
}
