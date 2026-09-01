export const MAX_COMMENT_LENGTH = 10000;

// Past this depth, replies keep nesting in the data model but visual indent
// stops increasing so deep threads stay readable on mobile. Also read by the
// #115 auto-collapse feature, which caps at the same depth.
export const MAX_VISIBLE_DEPTH = 6;

// Second, independent auto-collapse trigger (#125): a comment whose net
// score sinks to or below this threshold starts collapsed regardless of
// depth, ORed with the MAX_VISIBLE_DEPTH trigger above.
export const COLLAPSE_SCORE_THRESHOLD = -2;
