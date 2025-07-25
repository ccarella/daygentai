import * as React from "react"

import type { ToastActionElement, ToastProps } from "@/components/ui/toast"

const TOAST_LIMIT = 1
const TOAST_REMOVE_DELAY = 1500

type ToasterToast = ToastProps & {
  id: string
  title?: React.ReactNode
  description?: React.ReactNode
  action?: ToastActionElement
}

const ADD_TOAST = "ADD_TOAST"
const UPDATE_TOAST = "UPDATE_TOAST"
const DISMISS_TOAST = "DISMISS_TOAST"
const REMOVE_TOAST = "REMOVE_TOAST"

let count = 0

function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER
  return count.toString()
}

type Action =
  | {
      type: typeof ADD_TOAST
      toast: ToasterToast
    }
  | {
      type: typeof UPDATE_TOAST
      toast: Partial<ToasterToast>
    }
  | {
      type: typeof DISMISS_TOAST
      toastId?: ToasterToast["id"]
    }
  | {
      type: typeof REMOVE_TOAST
      toastId?: ToasterToast["id"]
    }

interface State {
  toasts: ToasterToast[]
}

const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>()

const addToRemoveQueue = (toastId: string) => {
  // Clear any existing timeout for this toast
  if (toastTimeouts.has(toastId)) {
    clearTimeout(toastTimeouts.get(toastId))
    toastTimeouts.delete(toastId)
  }

  const timeout = setTimeout(() => {
    toastTimeouts.delete(toastId)
    dispatch({
      type: REMOVE_TOAST,
      toastId: toastId,
    })
  }, TOAST_REMOVE_DELAY)

  toastTimeouts.set(toastId, timeout)
}

export const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case ADD_TOAST:
      // Start auto-dismiss timer when toast is added
      addToRemoveQueue(action.toast.id)
      return {
        ...state,
        toasts: [action.toast, ...state.toasts].slice(0, TOAST_LIMIT),
      }

    case UPDATE_TOAST:
      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === action.toast.id ? { ...t, ...action.toast } : t
        ),
      }

    case DISMISS_TOAST: {
      const { toastId } = action

      // Clear any existing timeout and immediately remove the toast
      if (toastId) {
        if (toastTimeouts.has(toastId)) {
          clearTimeout(toastTimeouts.get(toastId))
          toastTimeouts.delete(toastId)
        }
        // Immediately dispatch remove action
        setTimeout(() => {
          dispatch({
            type: REMOVE_TOAST,
            toastId: toastId,
          })
        }, 0)
      } else {
        state.toasts.forEach((toast) => {
          if (toastTimeouts.has(toast.id)) {
            clearTimeout(toastTimeouts.get(toast.id))
            toastTimeouts.delete(toast.id)
          }
          setTimeout(() => {
            dispatch({
              type: REMOVE_TOAST,
              toastId: toast.id,
            })
          }, 0)
        })
      }

      return {
        ...state,
        toasts: state.toasts.map((t) =>
          t.id === toastId || toastId === undefined
            ? {
                ...t,
                open: false,
              }
            : t
        ),
      }
    }
    case REMOVE_TOAST:
      if (action.toastId === undefined) {
        return {
          ...state,
          toasts: [],
        }
      }
      return {
        ...state,
        toasts: state.toasts.filter((t) => t.id !== action.toastId),
      }
  }
}

const listeners: Array<(state: State) => void> = []

let memoryState: State = { toasts: [] }

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action)
  listeners.forEach((listener) => {
    listener(memoryState)
  })
}

type Toast = Omit<ToasterToast, "id">

function toast({ ...props }: Toast) {
  const id = genId()

  const update = (props: ToasterToast) =>
    dispatch({
      type: UPDATE_TOAST,
      toast: { ...props, id },
    })
  const dismiss = () => dispatch({ type: DISMISS_TOAST, toastId: id })

  dispatch({
    type: ADD_TOAST,
    toast: {
      ...props,
      id,
      open: true,
      onOpenChange: (open) => {
        if (!open) dismiss()
      },
    },
  })

  return {
    id: id,
    dismiss,
    update,
  }
}

function useToast() {
  const [state, setState] = React.useState<State>(memoryState)

  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const index = listeners.indexOf(setState)
      if (index > -1) {
        listeners.splice(index, 1)
      }
    }
  }, [state])

  return {
    ...state,
    toast,
    dismiss: (toastId?: string) => {
      if (toastId === undefined) {
        dispatch({ type: DISMISS_TOAST })
      } else {
        dispatch({ type: DISMISS_TOAST, toastId })
      }
    },
  }
}

export { useToast, toast }