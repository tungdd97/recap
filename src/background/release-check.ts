import { browser } from "wxt/browser"
import { fetchLatestReleaseVersion } from "@/lib/release/fetch"
import type { LatestReleaseRequest, LatestReleaseResult } from "@/lib/release/messages"

function isLatestReleaseRequest(message: unknown): message is LatestReleaseRequest {
  return (message as Partial<LatestReleaseRequest> | null)?.type === "latest-release"
}

// WHY: the lookup runs here, not in the panel. A content script fetch runs under the page's
// origin, and Chrome blocks the GitHub calls from youtube.com ("Unsafe attempt to load URL").
export function registerReleaseCheckHandler(
  lookup: () => Promise<string | null> = () => fetchLatestReleaseVersion(),
): void {
  browser.runtime.onMessage.addListener(
    (message: unknown, _sender: unknown, sendResponse: (r: LatestReleaseResult) => void) => {
      if (!isLatestReleaseRequest(message)) return undefined
      lookup().then(
        (version) => sendResponse({ version }),
        () => sendResponse({ version: null }),
      )
      return true
    },
  )
}
