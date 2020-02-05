import Cookies from 'js-cookie';
import { getParameterValues } from '~/lib/utils/url_utility';
import { INLINE_DIFF_VIEW_TYPE, DIFF_VIEW_COOKIE_NAME, DIFFS_PER_PAGE } from '../../constants';

const viewTypeFromQueryString = getParameterValues('view')[0];
const viewTypeFromCookie = Cookies.get(DIFF_VIEW_COOKIE_NAME);
const defaultViewType = INLINE_DIFF_VIEW_TYPE;

export default () => ({
  isLoading: true,
  isBatchLoading: false,
  retrievingBatches: false,
  batchPageSize: (gon && gon.diffs_batch_page_size) || DIFFS_PER_PAGE,
  addedLines: null,
  removedLines: null,
  endpoint: '',
  basePath: '',
  commit: null,
  startVersion: null,
  diffFiles: [],
  mergeRequestDiffs: [],
  mergeRequestDiff: null,
  diffViewType: viewTypeFromQueryString || viewTypeFromCookie || defaultViewType,
  tree: [],
  treeEntries: {},
  showTreeList: true,
  currentDiffFileId: '',
  projectPath: '',
  commentForms: [],
  highlightedRow: null,
  renderTreeList: true,
  showWhitespace: true,
  fileFinderVisible: false,
  dismissEndpoint: '',
  showSuggestPopover: true,
  useSingleDiffStyle: false,
});
