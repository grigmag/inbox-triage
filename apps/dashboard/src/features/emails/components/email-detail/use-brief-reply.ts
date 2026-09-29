'use client';

import { useReducer, useRef } from 'react';
import { flushSync } from 'react-dom';
import type { GenerateBriefReplyActionResult } from '@/features/emails/actions/generate-brief-reply-action-result';
import { generateBriefReplyAction } from '@/features/emails/actions/generate-brief-reply.action';
import type { SendBriefReplyActionResult } from '@/features/emails/actions/send-brief-reply-action-result';
import { sendBriefReplyAction } from '@/features/emails/actions/send-brief-reply.action';
import type { BriefReplyActionInput } from '@/features/emails/brief-reply/brief-reply-input.schema';
import {
  briefReplyReducer,
  type BriefReplySource,
  initialBriefReplyState,
  isBriefReplyEdited,
  isBriefReplyStarted,
} from './brief-reply-state';

const unexpectedGenerateFailure = {
  status: 'failure',
  message: 'Unable to draft a reply. Please try again.',
} as const;

// A thrown action call may have reached the server after submission started.
const unexpectedSendFailure = {
  status: 'unconfirmed',
  message:
    'Unable to confirm that the reply was sent. Check your Sent folder before sending again.',
} as const;

/**
 * Holds the reply draft for one loaded message. The owning component remounts
 * per message, so drafts and sent state never outlive the message they belong
 * to.
 */
export function useBriefReply() {
  const [state, dispatch] = useReducer(
    briefReplyReducer,
    initialBriefReplyState,
  );
  // Sync lock: state updates are too late to block a double click.
  const pendingRef = useRef(false);
  const sentRef = useRef(false);

  /**
   * Resolves to whether a draft arrived. The result is committed before the
   * promise resolves, so the caller can focus the editor straight after it.
   */
  async function generate(
    messageRef: string,
    input: BriefReplyActionInput,
    source: BriefReplySource,
  ): Promise<boolean> {
    if (pendingRef.current || sentRef.current) {
      return false;
    }

    pendingRef.current = true;
    dispatch({ type: 'startGenerate', source });

    let result: GenerateBriefReplyActionResult;

    try {
      result = await generateBriefReplyAction(messageRef, input);
    } catch {
      result = unexpectedGenerateFailure;
    }

    pendingRef.current = false;
    // Renders the new draft and enables the editor now, not after the caller's
    // continuation runs.
    flushSync(() => {
      dispatch({ type: 'setGenerateResult', result });
    });

    return result.status === 'success';
  }

  function startBlank(source: BriefReplySource) {
    if (pendingRef.current || sentRef.current) {
      return;
    }

    dispatch({ type: 'startBlank', source });
  }

  async function send(messageRef: string) {
    if (pendingRef.current || sentRef.current || state.draft === null) {
      return;
    }

    pendingRef.current = true;
    dispatch({ type: 'startSend' });

    let result: SendBriefReplyActionResult;

    try {
      result = await sendBriefReplyAction({ messageRef, body: state.draft });
    } catch {
      result = unexpectedSendFailure;
    }

    pendingRef.current = false;
    sentRef.current = result.status === 'success';
    dispatch({ type: 'setSendResult', result });
  }

  function editDraft(draft: string) {
    dispatch({ type: 'editDraft', draft });
  }

  return {
    ...state,
    edited: isBriefReplyEdited(state),
    started: isBriefReplyStarted(state),
    generate,
    startBlank,
    send,
    editDraft,
  };
}
