export type FilterSet = {
  name: string;
  includePathName: string;
  excludePathName: string;
}

export type NoteFilterSet = FilterSet & {
  includeNoteName: string;
  excludeNoteName: string;
  includeTags: string;
  excludeTags: string;
}

export type FolderFilterSet = FilterSet & {
  rootFolder: string;
  depth: number, 
  includeParents: boolean;
  includeFolderName: string;
  excludeFolderName: string;
}