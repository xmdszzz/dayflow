# DayFlow

A Windows desktop calendar assistant that turns natural-language Chinese input into scheduled appointments via LLM-powered function calling.

## Language

**Task**:
A scheduled appointment with a specific date, start time, and end time. Not a todo item or a reminder with a fuzzy deadline.
_Avoid_: Event, todo, calendar item, agenda item

**Title**:
A short summary label for a task, displayed as its primary identifier. Required, ~50 chars max.
_Avoid_: Event, name, subject, summary

**Start Time / End Time**:
The beginning (`HH:mm`) and end (`HH:mm`) of a task's time range. Both are required — every task occupies a concrete time slot.
_Avoid_: Time, time point, duration

**Place**:
The physical or virtual location where the task takes place. Optional.
_Avoid_: Location, room, venue

**Person**:
The participant(s) involved in the task. Optional.
_Avoid_: Attendee, contact, participant

**Notes**:
Optional free-text details attached to a task — background context, preparation items, links, etc. Extracted automatically by the LLM from the user's natural-language input.
_Avoid_: Description, body, remarks, details

## Conversation

**Chat Message**:
A single turn in the conversation between the user and the LLM assistant. Every message is anchored to a task (`task_id`), even if that task is still being negotiated and hasn't been created yet — the renderer-side history preserves the thread across multi-turn exchanges.
_Avoid_: Message, utterance, prompt, response

**Confirmation**:
A temporary pause in the LLM tool-call loop where the assistant asks the user to choose between ambiguous options. Not a task state — it belongs to the conversation. Resolves when the user picks an option or cancels.
_Avoid_: Dialog, modal, approval, prompt

**Memory**:
A daily compressed summary of the previous day's conversation, stored as `chat_memory`. Injected into the LLM context as an optional `system` message to provide continuity across sessions.
_Avoid_: Context, history, archive

**Review**:
Free-form retrospective content attached to a completed task — lessons learned, experience notes, outcomes, reflections. Distinct from `notes` (which captures pre-execution context extracted by the LLM at creation time). Written after the task is done. Will be a separate data field, not appended to `notes`.
_Avoid_: Notes, summary, reflection, feedback
