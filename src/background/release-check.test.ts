import { describe, expect, it, vi } from "vitest"
import { fakeBrowser } from "wxt/testing/fake-browser"
import { registerReleaseCheckHandler } from "./release-check"

type Listener = (m: unknown, sender: unknown, sendResponse: (r: unknown) => void) => unknown

function capture(lookup: () => Promise<string | null>): Listener {
  let listener: Listener | undefined
  const spy = vi.spyOn(fakeBrowser.runtime.onMessage, "addListener").mockImplementation((fn) => {
    listener = fn as Listener
  })
  registerReleaseCheckHandler(lookup)
  spy.mockRestore()
  if (!listener) throw new Error("listener not registered")
  return listener
}

describe("registerReleaseCheckHandler", () => {
  it("answers a latest-release message with the looked-up version", async () => {
    const listener = capture(async () => "2.0.11")
    const reply = new Promise((resolve) => {
      expect(listener({ type: "latest-release" }, {}, resolve)).toBe(true)
    })
    expect(await reply).toEqual({ version: "2.0.11" })
  })

  it("answers null when the lookup throws", async () => {
    const listener = capture(async () => {
      throw new Error("offline")
    })
    const reply = new Promise((resolve) => listener({ type: "latest-release" }, {}, resolve))
    expect(await reply).toEqual({ version: null })
  })

  it("ignores other messages", () => {
    const listener = capture(async () => "2.0.11")
    expect(listener({ type: "validate-key" }, {}, () => {})).toBeUndefined()
  })
})
