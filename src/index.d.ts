export type FilterSet = {
  name: string;
}

export type NoteFilterSet = FilterSet & {
  includeNoteName: string;
  excludeNoteName: string;
  includePathName: string;
  excludePathName: string;
}

export type DirFilterSet = FilterSet & {
  includeDirName: string;
  excludeDirName: string;
  includePathName: string;
  excludePathName: string;
}