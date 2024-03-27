export type FilterSet = {
  name: string;
  includePathName: string;
  excludePathName: string;
}

export type NoteFilterSet = FilterSet & {
  includeNoteName: string;
  excludeNoteName: string;
}

export type FolderFilterSet = FilterSet & {
  includeFolderName: string;
  excludeFolderName: string;
}