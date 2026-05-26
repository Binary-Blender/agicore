export interface ProjectFile {
  /** Base filename, e.g. "summarize_and_post.agi". */
  name: string;
  /** Absolute path on disk. */
  path: string;
  /** Unix epoch seconds. Used by the hot-reload poller to detect
   *  external modifications to the active workflow's file. */
  modifiedAt: number;
}

export interface Project {
  /** Absolute path of the project root directory. */
  rootPath: string;
  /** Display name — last segment of rootPath. */
  name: string;
}
