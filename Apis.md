# Manasi AI — Postman Testing Guide

This guide provides a structured walkthrough for testing the **Manasi / ManaScience RAG Chatbot API** endpoints using Postman. 

## ⚙️ Environment Setup

Before executing requests, set up your **Collection Variables** or **Environment Variables** in Postman to make switching environments or sessions seamless.

| Variable Name | Initial Value | Description |
| :--- | :--- | :--- |
| `base_url` | `https://manasi-production.up.railway.app` | The local base URL of your FastAPI server[cite: 4]. |
| `session_id` | `test-session-999` | A tracking string used to group conversation turns in memory[cite: 4]. |

---

## 🛠️ The Endpoints

### 1. System Health Check
Verify that the FastAPI web server process is live and responsive[cite: 7].

*   **Method:** `GET`[cite: 4, 7]
*   **URL:** `{{base_url}}/health`[cite: 4, 7]
*   **Headers:** None required[cite: 7].
*   **Expected Response (200 OK):**[cite: 7]
    ```json
    {
      "status": "ok"
    }
    ```

---

### 2. Full Conversation Chat (Primary Path)
The primary user-facing path[cite: 9]. It utilizes the simple legacy FAISS RAG chain, generates a warm response, attaches a CTA, and **updates the conversation history** in memory[cite: 4, 9].

*   **Method:** `POST`[cite: 4, 9]
*   **URL:** `{{base_url}}/chat`[cite: 4, 9]
*   **Headers:** `Content-Type: application/json`[cite: 4, 9]
*   **Body (raw JSON):**[cite: 4, 9]
    ```json
    {
      "message": "What is neuroplasticity and how does ManaScience use it?",
      "session_id": "{{session_id}}"
    }
    ```
*   **Expected Response (200 OK):**[cite: 9]
    ```json
    {
      "answer": "Neuroplasticity is the brain's ability to reorganize itself...",
      "sources": [
        {
          "source": "manasi_overview.md",
          "content": "ManaScience is an educational platform..."
        }
      ],
      "cta": {
        "cta_found": true,
        "cta_id": "neuroplasticity/neuroplasticity",
        "cta_url": "[https://manascience.com/neuroplasticity](https://manascience.com/neuroplasticity)",
        "cta_trigger": "Explore neuroplasticity",
        "cta_category": "Neuroplasticity",
        "match_reason": "specific_match",
        "matched_phrase": "neuroplasticity",
        "response": "Neuroplasticity is the brain's ability...",
        "lookup_time_ms": 1.42,
        "error": null
      }
    }
    ```

---

### 3. Clear Session History
Forgets everything stored for a specific `session_id`[cite: 3]. Use this to simulate a user selecting a "New Chat" button[cite: 3].

*   **Method:** `DELETE`[cite: 4, 3]
*   **URL:** `{{base_url}}/chat/{{session_id}}`[cite: 4]
*   **Headers:** None required[cite: 3].
*   **Expected Response (200 OK):**[cite: 3]
    ```json
    {
      "status": "reset",
      "session_id": "test-session-999"
    }
    ```

---

### 4. Phase 1: Understand Node (Debug)
Truncates the pipeline to execute **only** Phase 1 (LLM classification of intent, topic, search queries, and emotional states)[cite: 1, 4]. *Does not save history.*[cite: 4]

*   **Method:** `POST`[cite: 4]
*   **URL:** `{{base_url}}/understand`[cite: 4]
*   **Headers:** `Content-Type: application/json`[cite: 4]
*   **Body (raw JSON):**[cite: 4]
    ```json
    {
      "message": "My child was diagnosed with ADHD, I'm worried",
      "session_id": "{{session_id}}"
    }
    ```

---

### 5. Phase 2: Knowledge Node (Debug)
Executes through the **Knowledge node** (`understanding → knowledge`) to inspect raw ChromaDB metadata filtering and similarity chunk retrieval outputs[cite: 5]. *Does not save history.*[cite: 4]

*   **Method:** `POST`[cite: 4, 5]
*   **URL:** `{{base_url}}/knowledge`[cite: 4, 5]
*   **Headers:** `Content-Type: application/json`[cite: 5]
*   **Body (raw JSON):**[cite: 4, 5]
    ```json
    {
      "message": "Tell me about MNRI therapy",
      "session_id": "{{session_id}}"
    }
    ```

---

### 6. Phase 3: Respond Node (Debug)
Executes through the **Response node** (`understanding → knowledge → response`) to inspect factually grounded raw generations **prior** to humanization or safety screening[cite: 2]. *Does not save history.*[cite: 4]

*   **Method:** `POST`[cite: 4, 2]
*   **URL:** `{{base_url}}/respond`[cite: 4, 2]
*   **Headers:** `Content-Type: application/json`[cite: 2]
*   **Body (raw JSON):**[cite: 4, 2]
    ```json
    {
      "message": "What courses do you offer?",
      "session_id": "{{session_id}}"
    }
    ```

---

### 7. Phase 4: Humanize Node (Debug)
Executes through the **Empathy node** (`understanding → knowledge → response → empathy`) to review the warm, emotionally tuned prose rewrite[cite: 6]. *Does not save history.*[cite: 4]

*   **Method:** `POST`[cite: 4, 6]
*   **URL:** `{{base_url}}/humanize`[cite: 4, 6]
*   **Headers:** `Content-Type: application/json`[cite: 6]
*   **Body (raw JSON):**[cite: 4, 6]
    ```json
    {
      "message": "I feel overwhelmed about my son's autism",
      "session_id": "{{session_id}}"
    }
    ```

---

### 8. Phase 5: Safety Node (Debug)
Executes through the **Safety node** (`understanding → knowledge → response → empathy → safety`) to view the output after medical guards, hallucination checks, and keyword distress alerts have screened the copy[cite: 1, 4]. *Does not save history.*[cite: 4]

*   **Method:** `POST`[cite: 4]
*   **URL:** `{{base_url}}/safety`[cite: 4]
*   **Headers:** `Content-Type: application/json`[cite: 4]
*   **Body (raw JSON):**[cite: 4]
    ```json
    {
      "message": "Should I stop my child's medication?",
      "session_id": "{{session_id}}"
    }
    ```

---

### 9. Phase 6: CTA Node (Full Pipeline Output)
Executes the **entire 6-node LangGraph pipeline**[cite: 8]. The structural layout of this endpoint response mirrors the final safe text combined with full deterministic keyword CTA decisions[cite: 8]. *Does not save history.*[cite: 4]

*   **Method:** `POST`[cite: 4, 8]
*   **URL:** `{{base_url}}/cta`[cite: 4, 8]
*   **Headers:** `Content-Type: application/json`[cite: 8]
*   **Body (raw JSON):**[cite: 4, 8]
    ```json
    {
      "message": "How do I book neurofeedback?",
      "session_id": "{{session_id}}"
    }
    ```

---

## 🛑 Troubleshooting Error Codes

*   **`422 Unprocessable Entity`**: Look closely at your request payload formatting[cite: 4]. You are likely missing the `"message"` key, or it is empty[cite: 4].
*   **`503 Service Unavailable`**: The server backend is still starting up, compiling the LangGraph network, or embedding chunks[cite: 4]. Wait a moment and retry[cite: 2, 9].
*   **`500 Internal Server Error`**: The application encountered an unexpected runtime crash, often caused by an invalid or missing `OPENAI_API_KEY` environment variable[cite: 4, 9].