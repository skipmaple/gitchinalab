import { GlEmptyState, GlButton } from '@gitlab/ui';
import { shallowMountExtended } from 'helpers/vue_test_utils_helper';
import ClustersEmptyState from '~/clusters_list/components/clusters_empty_state.vue';
import ClusterStore from '~/clusters_list/store';

const clustersEmptyStateImage = 'path/to/svg';
const newClusterPath = '/path/to/connect/cluster';
const emptyStateHelpText = 'empty state text';
const canAddCluster = true;

describe('ClustersEmptyStateComponent', () => {
  let wrapper;

  const provideData = {
    clustersEmptyStateImage,
    emptyStateHelpText: null,
    newClusterPath,
  };

  const entryData = {
    canAddCluster,
  };

  const findButton = () => wrapper.findComponent(GlButton);
  const findEmptyStateText = () => wrapper.findByTestId('clusters-empty-state-text');

  beforeEach(() => {
    wrapper = shallowMountExtended(ClustersEmptyState, {
      store: ClusterStore(entryData),
      provide: provideData,
      stubs: { GlEmptyState },
    });
  });

  afterEach(() => {
    wrapper.destroy();
  });

  it('should render the action button', () => {
    expect(findButton().exists()).toBe(true);
  });

  describe('when the help text is not provided', () => {
    it('should not render the empty state text', () => {
      expect(findEmptyStateText().exists()).toBe(false);
    });
  });

  describe('when the help text is provided', () => {
    beforeEach(() => {
      provideData.emptyStateHelpText = emptyStateHelpText;
      wrapper = shallowMountExtended(ClustersEmptyState, {
        store: ClusterStore(entryData),
        provide: provideData,
      });
    });

    it('should show the empty state text', () => {
      expect(findEmptyStateText().text()).toBe(emptyStateHelpText);
    });
  });

  describe('when the user cannot add clusters', () => {
    beforeEach(() => {
      wrapper.vm.$store.state.canAddCluster = false;
    });
    it('should disable the button', () => {
      expect(findButton().props('disabled')).toBe(true);
    });
  });
});
