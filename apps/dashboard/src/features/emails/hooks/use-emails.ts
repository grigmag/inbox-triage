'use client';

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { toast } from '@inbox-triage/ui';
import { loadEmailMessageAction } from '../actions/load-email-message.action';
import { loadInboxAction } from '../actions/load-inbox.action';
import { loadNewerInboxAction } from '../actions/load-newer-inbox.action';
import { loadOlderInboxAction } from '../actions/load-older-inbox.action';
import type { MailboxResult } from '../actions/mailbox-action-result';
import type {
  EmailMessageDto,
  EmailPageDto,
  EmailSummaryDto,
} from '../dto/email.dto';
import { emailReducer, initialEmailState } from '../state/email-state';

const unexpectedFailure = {
  status: 'failure',
  message: 'Unable to load emails. Please try again or check Email settings.',
} as const;

export function useEmails() {
  const [state, dispatch] = useReducer(emailReducer, initialEmailState);
  const isListRequestPending = useRef(false);
  const latestMessageRequest = useRef(0);

  const loadInitial = useCallback(async () => {
    if (isListRequestPending.current) {
      return;
    }

    isListRequestPending.current = true;
    dispatch({ type: 'startPageLoad', operation: 'initial' });

    let result: MailboxResult<EmailPageDto>;

    try {
      result = await loadInboxAction();
    } catch {
      result = unexpectedFailure;
    }

    isListRequestPending.current = false;
    dispatch({ type: 'setPageResult', operation: 'initial', result });
  }, []);

  useEffect(() => {
    void loadInitial();
  }, [loadInitial]);

  async function loadMore() {
    const pageToken = state.nextPageToken;

    if (isListRequestPending.current || !pageToken) {
      return;
    }

    isListRequestPending.current = true;
    dispatch({ type: 'startPageLoad', operation: 'older' });

    let result: MailboxResult<EmailPageDto>;

    try {
      result = await loadOlderInboxAction(pageToken);
    } catch {
      result = unexpectedFailure;
    }

    isListRequestPending.current = false;
    dispatch({ type: 'setPageResult', operation: 'older', result });
  }

  async function refresh() {
    if (isListRequestPending.current) {
      return;
    }

    const newest = state.messages[0];

    if (!newest) {
      await loadInitial();
      return;
    }

    isListRequestPending.current = true;
    dispatch({ type: 'startRefresh' });

    let result: MailboxResult<EmailSummaryDto[]>;

    try {
      result = await loadNewerInboxAction(newest.ref);
    } catch {
      result = unexpectedFailure;
    }

    isListRequestPending.current = false;
    dispatch({ type: 'setRefreshResult', result });

    if (result.status === 'success' && result.data.length === 0) {
      toast.add({ title: 'No new emails', type: 'info' });
    }
  }

  async function select(ref: string) {
    const requestId = ++latestMessageRequest.current;

    dispatch({ type: 'selectMessage', ref, requestId });

    let result: MailboxResult<EmailMessageDto>;

    try {
      result = await loadEmailMessageAction(ref);
    } catch {
      result = unexpectedFailure;
    }

    dispatch({ type: 'setMessageResult', ref, requestId, result });
  }

  return { state, loadInitial, loadMore, refresh, select };
}
