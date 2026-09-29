// Rule engine: evaluates user rules (created conversationally via Copilot)
// against transactions. Rules are the trigger/action JSONB from spending_rules.
//
// ponytail: naive linear scan over rules — fine for personal finance scale
// (tens of rules x thousands of txns). If a user ever has >10k rules, index by
// category in Redis. Ceiling noted, not prematurely optimized.

export interface RuleAction {
  type: 'set_category' | 'set_status' | 'ignore_transaction';
  value?: string;
}

export interface Rule {
  id: string;
  name: string;
  trigger_condition: {
    merchant_contains?: string;
    merchant_contains_any?: string[];
    category_is?: string;
    min_amount?: number;
    max_amount?: number;
    capture_method_is?: string;
  };
  action: RuleAction;
  is_active: boolean;
}

export interface RuleInput {
  id: string;
  merchant: string;
  amount: number;
  category_name?: string;
  capture_method?: string;
}

export interface RuleResult {
  txId: string;
  ruleId: string;
  ruleName: string;
  category?: string;
  status?: string;
}

function matches(trigger: Rule['trigger_condition'], tx: RuleInput): boolean {
  // All specified conditions must hold (AND).
  if (trigger.merchant_contains) {
    if (!tx.merchant.toLowerCase().includes(trigger.merchant_contains.toLowerCase())) return false;
  }
  if (trigger.merchant_contains_any?.length) {
    const lower = tx.merchant.toLowerCase();
    if (!trigger.merchant_contains_any.some((m) => lower.includes(m.toLowerCase()))) return false;
  }
  if (trigger.category_is && tx.category_name !== trigger.category_is) return false;
  if (trigger.capture_method_is && tx.capture_method !== trigger.capture_method_is) return false;
  // Amount compares against magnitude so -25.00 matches min_amount 20
  const mag = Math.abs(tx.amount);
  if (trigger.min_amount !== undefined && mag < trigger.min_amount) return false;
  if (trigger.max_amount !== undefined && mag > trigger.max_amount) return false;
  return true;
}

/** Apply every active rule to a transaction; first match wins per tx. */
export function evaluateTransaction(tx: RuleInput, rules: Rule[]): RuleResult | null {
  for (const rule of rules) {
    if (!rule.is_active) continue;
    if (!matches(rule.trigger_condition, tx)) continue;
    const out: RuleResult = { txId: tx.id, ruleId: rule.id, ruleName: rule.name };
    switch (rule.action.type) {
      case 'set_category':
        out.category = rule.action.value;
        break;
      case 'set_status':
        out.status = rule.action.value;
        break;
      case 'ignore_transaction':
        out.status = 'ignored';
        break;
    }
    return out;
  }
  return null;
}

export function evaluateBatch(txs: RuleInput[], rules: Rule[]): RuleResult[] {
  return txs.map((tx) => evaluateTransaction(tx, rules)).filter((r): r is RuleResult => r !== null);
}
