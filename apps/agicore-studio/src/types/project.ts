export interface ProjectFile {
  /** Base filename, e.g. "summarize_and_post.agi". */
  name: string;
  /** Absolute path on disk. */
  path: string;
}

export interface Project {
  /** Absolute path of the project root directory. */
  rootPath: string;
  /** Display name — last segment of rootPath. */
  name: string;
}
