export type FilterSet = {
  name: string;
}

export type NoteFilterSet = FilterSet & {
  includeNoteName: string;
  excludeNoteName: string;
  includePathName: string;
  excludePathName: string;
}

export type FolderFilterSet = FilterSet & {
  includeFolderName: string;
  excludeFolderName: string;
  includePathName: string;
  excludePathName: string;
}