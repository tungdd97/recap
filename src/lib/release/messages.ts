import { browser } from "wxt/browser"

export interface LatestReleaseRequest {
  type: "latest-release"
}

export interface LatestReleaseResult {
  version: string | null
}

/** Asks the background for the latest release version. Null when it could not be found. */
export async function requestLatestReleaseVersion(): Promise<string | null> {
  const request: LatestReleaseRequest = { type: "latest-release" }
  const result = (await browser.runtime.sendMessage(request)) as LatestReleaseResult | undefined
  return result?.version ?? null
}
