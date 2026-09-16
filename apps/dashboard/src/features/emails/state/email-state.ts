import type { MailboxResult } from '../actions/mailbox-action-result';
import type {
  EmailMessageDto,
  EmailPageDto,
  EmailSummaryDto,
} from '../dto/email.dto';

type PageLoadOperation = 'initial' | 'older';

type OperationState = { loading: boolean; error: string | null };

export type EmailState = {
  messages: EmailSummaryDto[];
  nextPageToken: string | null;
  selectedRef: string | null;
  message: EmailMessageDto | null;
  messageRequestId: number;
  noConnection: boolean;
  initial: OperationState;
  older: OperationState;
  refresh: OperationState;
  detail: OperationState;
};

const idleOperationState: OperationState = {
  loading: false,
  error: null,
};

export const initialEmailState: EmailState = {
  messages: [],
  nextPageToken: null,
  selectedRef: null,
  message: null,
  messageRequestId: 0,
  noConnection: false,
  initial: { loading: true, error: null },
  older: idleOperationState,
  refresh: idleOperationState,
  detail: idleOperationState,
};

export type EmailStateAction =
  | { type: 'startPageLoad'; operation: PageLoadOperation }
  | {
      type: 'setPageResult';
      operation: PageLoadOperation;
      result: MailboxResult<EmailPageDto>;
    }
  | { type: 'startRefresh' }
  | { type: 'setRefreshResult'; result: MailboxResult<EmailSummaryDto[]> }
  | { type: 'selectMessage'; ref: string; requestId: number }
  | {
      type: 'setMessageResult';
      ref: string;
      requestId: number;
      result: MailboxResult<EmailMessageDto>;
    };

function deduplicateMessages(messages: EmailSummaryDto[]): EmailSummaryDto[] {
  const seen = new Set<string>();

  return messages.filter(({ ref }) => {
    if (seen.has(ref)) {
      return false;
    }

    seen.add(ref);
    return true;
  });
}

function getFailureState(
  result: { status: 'noConnection' } | { status: 'failure'; message: string },
): OperationState {
  return {
    loading: false,
    error:
      result.status === 'noConnection'
        ? 'Connect your mailbox in Email settings.'
        : result.message,
  };
}

export function emailReducer(
  state: EmailState,
  action: EmailStateAction,
): EmailState {
  switch (action.type) {
    case 'startPageLoad': {
      return { ...state, [action.operation]: { loading: true, error: null } };
    }

    case 'setPageResult': {
      const { result, operation } = action;

      if (result.status !== 'success') {
        const noConnection =
          state.noConnection ||
          (operation === 'initial' && result.status === 'noConnection');

        return {
          ...state,
          [operation]: getFailureState(result),
          noConnection,
        };
      }

      return {
        ...state,
        [operation]: idleOperationState,
        noConnection: false,
        messages: deduplicateMessages(
          operation === 'initial'
            ? result.data.messages
            : [...state.messages, ...result.data.messages],
        ),
        nextPageToken: result.data.nextPageToken,
      };
    }

    case 'startRefresh': {
      return {
        ...state,
        refresh: { loading: true, error: null },
      };
    }

    case 'setRefreshResult': {
      const { result } = action;

      if (result.status !== 'success') {
        return { ...state, refresh: getFailureState(result) };
      }

      return {
        ...state,
        refresh: idleOperationState,
        messages: deduplicateMessages([...result.data, ...state.messages]),
      };
    }

    case 'selectMessage': {
      return {
        ...state,
        selectedRef: action.ref,
        message: null,
        messageRequestId: action.requestId,
        detail: { loading: true, error: null },
      };
    }

    case 'setMessageResult': {
      if (
        action.ref !== state.selectedRef ||
        action.requestId !== state.messageRequestId
      ) {
        return state;
      }

      if (action.result.status !== 'success') {
        return { ...state, detail: getFailureState(action.result) };
      }

      return {
        ...state,
        message: action.result.data,
        detail: idleOperationState,
      };
    }
  }
}
