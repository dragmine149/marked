import { MarkedExtension } from "marked";

import { markedAlignment } from "./markedAlignment";
import { markedDropdown } from "./markedDropdown";
import { markedEditableCheckbox } from "./markedEditableCheckbox";
import { markedImprovedImage } from "./markedImprovedImage";
import { markedLocalLink } from "./markedLocalLink";
import { markedLocalTime } from "./markedLocalTime";

export interface PostedMarkedExtension<ParserOutput = string, RendererOutput = string> extends MarkedExtension<ParserOutput, RendererOutput> {
  postprocess?(obj: HTMLElement): void;
}

export { markedAlignment, markedDropdown, markedEditableCheckbox, markedImprovedImage, markedLocalLink, markedLocalTime }
