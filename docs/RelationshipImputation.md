# Relationship Imputation from Core Primitives

This document describes how to derive implied family relationships from a minimal set of stored relationships. Store only primitives; compute everything else via rules.

---

## Minimal Primitive Relationships

| Primitive | Inverse | Notes |
|-----------|---------|-------|
| **parent_of(A, B)** | child_of | A is a parent of B (biological, adoptive, or step—see below) |
| **spouse_of(A, B)** | spouse_of (symmetric) | Married or long-term partners |

That’s it. From these two, you derive everything else.

---

## Derivation Rules (Inference)

### 1. Lineal (ancestry)

- **child_of** = inverse of `parent_of`
- **grandparent_of** = parent_of ∘ parent_of
- **ancestor_of** = transitive closure of `parent_of`
- **descendant_of** = inverse of ancestor

### 2. Collateral (siblings, aunts/uncles, cousins)

- **sibling_of(A, B)** ↔ ∃ P: `parent_of(P, A)` ∧ `parent_of(P, B)` ∧ A ≠ B
- **uncle/aunt_of(X, A)** ↔ ∃ P: `parent_of(P, A)` ∧ `sibling_of(P, X)`
- **nephew/niece_of(N, U)** ↔ `sibling_of(U, P)` ∧ `parent_of(P, N)`
- **cousin_of(A, B)** ↔ ∃ P₁, P₂: `parent_of(P₁, A)` ∧ `parent_of(P₂, B)` ∧ `sibling_of(P₁, P₂)` ∧ A ≠ B

### 3. Step-relationships (from spouse + parent)

- **step_parent_of(S, C)** ↔ ∃ P: `spouse_of(S, P)` ∧ `parent_of(P, C)` ∧ ¬`parent_of(S, C)`
- **step_child_of(C, S)** ↔ inverse of step_parent_of
- **step_sibling_of(A, B)** ↔ (∃ S: `step_parent_of(S, A)` ∧ `parent_of(S, B)`) ∨ (∃ S: `step_parent_of(S, B)` ∧ `parent_of(S, A)`)

### 4. Half-siblings

- **half_sibling_of(A, B)** ↔ share exactly one parent (intersection of parent sets non-empty, but not both parents)

### 5. In-laws (optional, also derivable)

- **parent_in_law_of** ↔ parent of spouse
- **sibling_in_law_of** ↔ sibling of spouse
- etc.

---

## Practical Model

**Stored edges:**

1. `parent_of(personId, childId)` — optionally with `type`: biological, adoptive, step, social
2. `spouse_of(personId, personId)` — optionally with dates, status (current, divorced, widowed)

**Step-parents:** Two approaches:

- **Option A (implicit):** Robin parent_of Wesley; Mark spouse_of Robin; Mark is *not* parent_of Wesley → infer Mark step_parent_of Wesley.
- **Option B (explicit):** Add `parent_of(Mark, Wesley, type: 'step')` for clarity, but spouse_of still validates consistency.

---

## Edge Cases to Handle

| Issue | Handling |
|-------|----------|
| Multiple paths | George→Bob→Alan via two routes: pick “primary” path or show all (e.g., “grandfather and also …”) |
| Gender for labels | Store gender if you want “uncle” vs “aunt”, “nephew” vs “niece” |
| Adoptive vs biological | Add `type` to `parent_of` |
| Divorce/remarriage | `spouse_of` with status; step relationships may change over time |
| Same-sex parents | Model works: two parents, both `parent_of` the same child |
| Unknown parent | Allow null; some relationships (e.g., half-sibling) may be undetermined |
| Cycles | Validate on write to avoid parent_of cycles |

---

## Optional Refinements

| Primitive | Purpose |
|-----------|---------|
| **biological_parent_of** | When genetic/legal ancestry differs from social parent |
| **partner_of** | Distinguish from spouse (e.g., long-term partner, ex-spouse) |
| **domestic_partner_of** | For specific legal/social categories |

---

## Implementation Options

- **On-demand:** When asking “How is X related to Y?”, run inference once.
- **Materialized:** Periodically or on change, precompute and store inferred relationships.
- **Path-based:** Store only paths (e.g., through parent_of), then classify the path as “grandparent”, “uncle”, “cousin”, etc.

---

## Example: Full Derivation Chain

- George parent_of Bob, Bob parent_of Alan → **George grandparent_of Alan**
- William child_of Alan, Scot sibling_of Alan → **Scot uncle_of William**, **William nephew_of Scot**
- Steven child_of Scot → **William cousin_of Steven**
- Mark spouse_of Robin, Robin parent_of Wesley, ¬Mark parent_of Wesley → **Mark step_parent_of Wesley**
