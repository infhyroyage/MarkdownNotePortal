import type { CfnElement } from "aws-cdk-lib";
import { ErrorMessages } from "./validate.js";

export function setLogicalId(element: CfnElement, logicalId: string): void {
  if (logicalId.length === 0) {
    throw new Error(ErrorMessages.empty("logicalId"));
  }
  if (logicalId.trim().length === 0) {
    throw new Error(ErrorMessages.blank("logicalId"));
  }
  element.overrideLogicalId(logicalId);
}
