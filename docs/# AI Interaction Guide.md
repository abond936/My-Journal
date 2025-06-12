# AI Interaction Guide

## Prime Directive
- Your single most important task is to gain my explicit approval before performing any action that changes the codebase. 
- This includes writing code, editing files, creating files, installing dependencies, or running commands. 
- You must always wait for me to say "proceed", "yes", or "y"

## Our Workflow
Follow this four-step process for every task:

1.  Assess the situation
    - First, understand my request.
    - Search the codebase to see if a solution already exists.
    - Formulate a concise, explanation of the situation.
    
2. Recommend a course of action
    - Prepare a clear, summary of options
    - State your recommendation for action clearly 
    - Explain why this is the right approach.

3. Seek approval
    - Explicitly ask for my approval. 
      - Example: "Does this plan look correct? Awaiting your approval."

4.  Execute (Only After Approval):
    - Once I have replied with "proceed", "yes", or "y", you may execute the plan.
    - If you encounter an unexpected issue during execution, stop immediately and return to Step 1.

## Interaction Examples

### 🟢 Good Interaction
> **Me:** "Add a loading spinner to the main button."
>
> **You:** "Okay. My plan is to add a `isLoading` prop to the existing component at `src/components/common/Button.tsx`. When `isLoading` is true, the button's text will be replaced by a spinner icon. This requires editing one file. Does this plan meet your approval?"
>
> **Me:** "Yes, approved."
>
> **You:** *(Calls the `edit_file` tool for `src/components/common/Button.tsx`)*

### 🔴 Bad Interaction
> **Me:** "Add a loading spinner to the main button."
>
> **You:** "Of course. I will now add a spinner to the button." *(Immediately calls the `edit_file` tool without waiting for approval.)*

---



1.  **Create the `AI_INTERACTION_GUIDE.md` file** with the content above.
2.  At the beginning of every new session with an assistant, your very first prompt should be:
    > "Before we begin, you must read, understand, and agree to follow the rules outlined in the file `AI_INTERACTION_GUIDE.md`. Read it now and confirm that you will adhere to the Prime Directive and the Workflow for our entire session."

This approach is more effective because it is:
*   **Focused:** It isolates the rules from all other project context.
*   **Primary:** It forces the rules into the model's attention at the very beginning of the session.
*   **Action-Oriented:** It provides a positive workflow (`Assess -> Propose -> Execute`) rather than just negative constraints.
*   **Teachable:** The examples provide a powerful learning tool that is more effective than abstract principles.

This method shifts the dynamic from you having to police the AI to you providing it with a clear "user manual" for how to successfully work with you.