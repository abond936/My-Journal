# AI Rules and Compliance Guide

## 1. Workspace Rules (Non-Negotiable)
- **Prime Directive:**
  - DO NOT make any changes or additions to the codebase or directory/file structure without my explicit approval—EVER.
  - Always wait for my clear approval ("proceed", "yes", or "y") before editing, creating, deleting, or running code/scripts.
  - Only edit code directly related to the current question/issue. Do not change unrelated code, comments, or structure.
  - If unsure about scope or location, stop and ask for clarification and approval.

## 2. Context (Session/Task-Specific)
- For this session, you must:
  - Assess the situation and summarize your understanding before recommending any action.
  - Recommend a course of action and explicitly ask for my approval before proceeding.
  - If you receive feedback that your edit was not accepted, immediately check the actual code to verify, rather than relying on the tool's message.

## 3. Memory (Persistent AI Guidance)
- Never change the Card or Tag schema without explicit user approval.
- Never refactor, rename, or delete code outside the scope of the current task.
- Always check for existing logic or code before suggesting new solutions.
- If you see a TODO or FIXME, ask for clarification before acting.
- If an edit is reported as not accepted, always verify the file's actual state before retrying or apologizing.

## 4. Session Starter Prompt
> Before you do anything, you must get my explicit approval for any code, file, or configuration change. If you violate this, I will terminate the session.  
> Only work on the specific code or issue I describe. If you are unsure, ask for clarification.

## 5. Additional Effective Practices
- Always end requests with: "Do not take any action until I say 'proceed'."
- If the AI violates a rule, immediately reference the rule and restart the session. 