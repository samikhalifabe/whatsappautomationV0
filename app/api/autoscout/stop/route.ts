import { NextResponse } from "next/server"
import { cancelScraping } from "../autoscoutState"

export async function POST() {
  try {
    // Set the cancellation flag to true
    cancelScraping()

    return NextResponse.json({ success: true, message: "Extraction annulée" })
  } catch (error) {
    return NextResponse.json({ success: false, error: (error as Error).message }, { status: 500 })
  }
}
