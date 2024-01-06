export type FilterSet = {
  name: string;
}

export type FileFilterSet = FilterSet & {
  includeFileName: string;
  excludeFileName: string;
  includePathName: string;
  excludePathName: string;
}

export type DirFilterSet = FilterSet & {
  includeDirName: string;
  excludeDirName: string;
  includePathName: string;
  excludePathName: string;
}