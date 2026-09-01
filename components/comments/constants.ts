export const MAX_COMMENT_LENGTH = 10000;

// Past this depth, replies keep nesting in the data model but visual indent
// stops increasing so deep threads stay readable on mobile. Also read by the
// #115 auto-collapse feature, which caps at the same depth.
export const MAX_VISIBLE_DEPTH = 6;
