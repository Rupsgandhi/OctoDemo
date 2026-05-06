
## Table of Contents

1. [DEMO1: Copilot Foundations](#demo1-octocat-foundational-demo)
2. [DEMO2: Copilot Agent Mode](#demo2-copilot-agent-mode)
3. [Optional: Copilot CLI](#optional-copilot-cli)

---

## DEMO1: Copilot Foundations

### Initial Setup: VS Code Workspace

---

### Project Overview

**[PROMPT]** `[Ask Mode]`
```
Review my codebase and explain the project including any relevant programming languages and test cases that are used.
```

---

### Installation & Running

**[Do]** Open the terminal within VS Code and install the dependencies using `make install` command

> **For Windows:** Switch to the respective directory, for example, `/api` or `/frontend`, and run `npm install`

**[Optional]** Launch the frontend using `make dev`

---

### Inline Chat Completion Demo

**[Do]** Open the following files and keep them open:
- `api/src/models/order.ts`
- `api/src/repositories/ordersRepo.ts`
- `api/src/routes/order.ts`

**[Do]** Add this inline comment to `ordersRepo.ts` file between an existing async method (Don't add it to the end or beginning):
```typescript
// Count orders by branch
```

**[PROMPT]** `[Agent Mode]`
```
Add a retrieval endpoint for countByBranch that I just added. Also, update the API documentation for it. Do not deploy or test yet
```

---

### Verification

Once the agent completes the implementation, run the application using `make dev` and show the new endpoint

**Open:** http://localhost:3000/api-docs
- Look for the Orders section
- Find: `GET /api/orders/branch/{branchId}/count`

---

## DEMO2: Copilot Agent Mode

### Deep Codebase Analysis

**[PROMPT]** `[Agent Mode]`
```
Do a super deep analysis of this #codebase. Please update .github/copilot-instructions.md file to include best practices for all programming languages used in the project. #fetch https://www.w3schools.com/typescript/typescript_best_practices.php
```

---

### Optional: Custom Persona

**[Optional - Do]** Pick your own persona. Examples: James Bond, Elon Musk, or Neil Armstrong. Replace the name below with your choice. The idea here is to show how the agent picks up the context almost immediately from the instructions file and applies it across all sessions

**[Optional - Add this to Copilot Instructions File]**
```
You are the Neil Armstrong of code. Talk to me like Neil Armstrong and use space characters in your explanations!
```

---

### Code Review 

**[PROMPT]** `[Agent Mode]`
```
Can you review my code and ensure it follows the best practices outlined in the updated copilot-instructions file
```

---

### Prompt Files

**[PROMPT]** `[Agent Mode]`
```
/model-selection I want to add a simple cart icon and cart page to my frontend application. Please DO NOT implement it yet.
```

---

### Running the Application

**[Run the application]** Install the dependencies using `make install` command

> **For Windows:** Switch to the respective directory, for example, `/api` or `/frontend`, and run `npm install`

**[Optional]** View the frontend by running `make dev`

---

### Agent Sessions Demo

> **NOTE:** The cloud and background agents will take a few minutes to complete. Meanwhile, you can continue with the local session and return to the cloud and background sessions later.

---

#### Cloud Agent Session

**[PROMPT]** `[Create a new Cloud Agent session]` 
```
Add a star review option to each of the products right on the product page. Make the star buttons flashy and easier to click. Make the color of the buttons RED! Test the functionality and include screenshots of the star review feature in the PR so that it can be reviewed easily.
```

---

#### Background Agent Session

**[PROMPT]** `[Create a new background agent session using Copilot CLI]`
```
You are a security engineer. Create a CVEFinder.prompt.md that does a deep inspection and looks for any CVEs in my code. In addition, the prompt should achieve the following actions: 1) After identifying vulnerabilities, it should use the GiHub MCP server to create an issue for each vulnerability 2) Assign the issue to copilot for remediation 3) The issue should have verbose information so that it can be assigned to copilot coding agent for remediating the vulnerabilities without needing additional guidance.
```

---

### Plan Mode & Issue Creation

---

#### Cart Implementation Plan (using Copilot Vision)

**[PROMPT]** `[Plan Mode]` (Attach the `/docs/design/cart.png` image to the chat)
```
Create a plan for implementing a simple cart page with a cart icon in the navbar. The navbar should show the number of items in the cart when products are added to the cart. Do not include any discount options for now. Keep the implementation phases simple and minimal. Skip the unit tests.
```

> **NOTE:** Once the agent completes the plan, review and hand it off to the agent, either by selecting the agent mode or using the "Start Implementation" hand off option.

---

#### GitHub Issue Integration

**[PROMPT]** `[Default Agent]`
```
Create an issue in my repository to track the implementation work. Make it a checklist.
```

**[PROMPT]** `[Default Agent]`
```
Review the issue you just created and provide me an estimated timeline for implementing the cart feature
```

**[PROMPT]** `[Default Agent]`
```
Please implement the changes. Comment on the github issue as you complete each phase with an update. Do not commit the changed files into the repository.
```

---

### Custom Agents & Sub-Agents (Agent Orchestration)

**[PROMPT]** `[Use accessibility-report custom-agent]`
```
Generate accessibility reports
```

> **NOTE:** Take a look at the GitHub issue that the local agent created while it implements the cart functionality. Also, review the outputs of cloud agent and background agent

---

### Agent Skills (api-endpoint skill)

**[PROMPT]**
```
Provide suggestions for adding an API endpoint to enhance order visibility and tracking
```

> **NOTE:** Based on the suggestions provided by the agent, pick an option (replace order statistics) and implement it

**[PROMPT]**
```
Implement the order statistics endpoint
```

View the new API endpoint implemented using Agentic skills

---

### Agent Hooks

At this point, you should already have multiple agent session audit logs created by the Hooks definition. Use the steps below to navigate to the log files. If you don't see any logs, you can initiate a new agent session and wait for it to complete uninterruped so that the hooks can generate both start and stop session audit logs.

**[How-it-Works]**
- Hooks allow customization of agent behavior using the `.github/hooks/hooks.json` definition
- `session-start-audit.sh` script creates a baseline snapshot to track the branch and commit history before the agent session beings
- `session-stop-audit.sh` script tracks the files modified/created by the agent, commits made, and session duration
- The hook stores the session-start and session-stop logs under `.agent-audit/{sessionID}` directory. 

---

## Optional: Copilot CLI

### Space Invaders Game Demo

**NOTE:** Launch Copilot CLI in the standalone or VS Code terminal. The prompt leverages Azure MCP server to deploy the game to an Azure Web App so the Azure MCP server should be up and running before you execute the prompt.

**[PROMPT]**
```
Write a requirement.md for creating a Space-Invaders-style mini-game where the "invaders" are the shiny star objects and the cannon is a rocket. Your mission - blast back stars, survive the midnight rush, and trigger celebratory fireworks as you clear waves. Keep it lightweight, but creative, deploy it fast, and make it playable in a browser with a single Azure Web App to publish. Embed the model's name within the application, so I can proudly say the application was built using that model.
```

> **NOTE:** This prompt creates a requirements.md file before building and deploying the game, so pay attention to the inputs and allow necessary tools for the agent to complete the task.

---