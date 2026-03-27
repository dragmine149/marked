import { MarkedExtension } from "marked";

import { markedCenterText } from "./markedCenterText";
import { markedDropdown } from "./markedDropdown";
import { markedEditableCheckbox } from "./markedEditableCheckbox";
import { markedImprovedImage } from "./markedImprovedImage";
import { markedLocalLink } from "./markedLocalLink";
import { markedLocalTime } from "./markedLocalTime";

export interface PostedMarkedExtension<ParserOutput = string, RendererOutput = string> extends MarkedExtension<ParserOutput, RendererOutput> {
  postprocess?(obj: HTMLElement): void;
}

export { markedCenterText, markedDropdown, markedEditableCheckbox, markedImprovedImage, markedLocalLink, markedLocalTime }
