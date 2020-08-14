import { shallowMount } from '@vue/test-utils';
import MockAdapter from 'axios-mock-adapter';
import RelatedIssues from 'ee/vulnerabilities/components/related_issues.vue';
import RelatedIssuesBlock from 'ee/related_issues/components/related_issues_block.vue';
import { issuableTypesMap, PathIdSeparator } from 'ee/related_issues/constants';
import axios from '~/lib/utils/axios_utils';
import createFlash from '~/flash';
import httpStatusCodes from '~/lib/utils/http_status';

jest.mock('~/flash');

const mockAxios = new MockAdapter(axios);

describe('Vulnerability related issues component', () => {
  let wrapper;

  const propsData = {
    endpoint: 'endpoint',
    projectPath: 'project/path',
    helpPath: 'help/path',
    canModifyRelatedIssues: true,
  };

  const issue1 = { id: 3, vulnerabilityLinkId: 987 };
  const issue2 = { id: 25, vulnerabilityLinkId: 876 };

  const createWrapper = async (data = {}) => {
    wrapper = shallowMount(RelatedIssues, { propsData, data: () => data });
    // Need this special check because RelatedIssues creates the store and uses its state in the data function, so we
    // need to set the state of the store, not replace the state property.
    if (data.state) {
      wrapper.vm.store.state = data.state;
    }
  };

  const relatedIssuesBlock = () => wrapper.find(RelatedIssuesBlock);
  const blockProp = prop => relatedIssuesBlock().props(prop);
  const blockEmit = (eventName, data) => relatedIssuesBlock().vm.$emit(eventName, data);

  afterEach(() => {
    wrapper.destroy();
    mockAxios.reset();
  });

  it('passes the expected props to the RelatedIssuesBlock component', async () => {
    window.gl = { GfmAutoComplete: { dataSources: {} } };
    const data = {
      isFetching: true,
      isSubmitting: true,
      isFormVisible: true,
      inputValue: 'input value',
      state: {
        relatedIssues: [{}, {}, {}],
        pendingReferences: ['#1', '#2', '#3'],
      },
    };

    createWrapper(data);

    expect(relatedIssuesBlock().props()).toMatchObject({
      helpPath: propsData.helpPath,
      isFetching: data.isFetching,
      isSubmitting: data.isSubmitting,
      relatedIssues: data.state.relatedIssues,
      canAdmin: propsData.canModifyRelatedIssues,
      pendingReferences: data.state.pendingReferences,
      isFormVisible: data.isFormVisible,
      inputValue: data.inputValue,
      autoCompleteSources: window.gl.GfmAutoComplete.dataSources,
      issuableType: issuableTypesMap.ISSUE,
      pathIdSeparator: PathIdSeparator.Issue,
      showCategorizedIssues: false,
    });
  });

  describe('fetch related issues', () => {
    it('fetches related issues when the component is created', async () => {
      mockAxios.onGet(propsData.endpoint).replyOnce(httpStatusCodes.OK, [issue1, issue2]);
      createWrapper();
      await axios.waitForAll();

      expect(mockAxios.history.get).toHaveLength(1);
      expect(blockProp('relatedIssues')).toMatchObject([issue1, issue2]);
    });

    it('shows an error message if the fetch fails', async () => {
      mockAxios.onGet(propsData.endpoint).replyOnce(httpStatusCodes.SERVICE_UNAVAILABLE);
      createWrapper();
      await axios.waitForAll();

      expect(blockProp('relatedIssues')).toEqual([]);
      expect(createFlash).toHaveBeenCalledTimes(1);
    });
  });

  describe('add related issue', () => {
    beforeEach(() => {
      mockAxios.onGet(propsData.endpoint).replyOnce(httpStatusCodes.OK, []);
      createWrapper({ isFormVisible: true });
    });

    it('adds related issue with vulnerabilityLinkId populated', async () => {
      mockAxios
        .onPost(propsData.endpoint)
        .replyOnce(httpStatusCodes.OK, { issue: {}, id: issue1.vulnerabilityLinkId });
      blockEmit('addIssuableFormSubmit', { pendingReferences: '#1' });
      await axios.waitForAll();

      expect(mockAxios.history.post).toHaveLength(1);
      const requestData = JSON.parse(mockAxios.history.post[0].data);
      expect(requestData.target_issue_iid).toBe('1');
      expect(requestData.target_project_id).toBe(propsData.projectPath);
      expect(blockProp('relatedIssues')).toHaveLength(1);
      expect(blockProp('relatedIssues')[0].vulnerabilityLinkId).toBe(issue1.vulnerabilityLinkId);
      expect(createFlash).not.toHaveBeenCalled();
    });

    it('adds multiple issues', async () => {
      mockAxios.onPost(propsData.endpoint).reply(httpStatusCodes.OK, { issue: {} });
      blockEmit('addIssuableFormSubmit', { pendingReferences: '#1 #2 #3' });
      await axios.waitForAll();

      expect(mockAxios.history.post).toHaveLength(3);
      expect(blockProp('relatedIssues')).toHaveLength(3);
      expect(blockProp('isFormVisible')).toBe(false);
      expect(blockProp('inputValue')).toBe('');
    });

    it('adds only issues that returns issue', async () => {
      mockAxios
        .onPost(propsData.endpoint)
        .replyOnce(httpStatusCodes.OK, { issue: {} })
        .onPost(propsData.endpoint)
        .replyOnce(httpStatusCodes.SERVICE_UNAVAILABLE)
        .onPost(propsData.endpoint)
        .replyOnce(httpStatusCodes.OK, { issue: {} })
        .onPost(propsData.endpoint)
        .replyOnce(httpStatusCodes.SERVICE_UNAVAILABLE);
      blockEmit('addIssuableFormSubmit', { pendingReferences: '#1 #2 #3 #4' });
      await axios.waitForAll();

      expect(mockAxios.history.post).toHaveLength(4);
      expect(blockProp('relatedIssues')).toHaveLength(2);
      expect(blockProp('isFormVisible')).toBe(true);
      expect(blockProp('inputValue')).toBe('');
      expect(blockProp('pendingReferences')).toEqual(['#2', '#4']);
      expect(createFlash).toHaveBeenCalledTimes(1);
    });
  });

  describe('related issues form', () => {
    it.each`
      from     | to
      ${true}  | ${false}
      ${false} | ${true}
    `('toggles form visibility from $from to $to', async ({ from, to }) => {
      createWrapper({ isFormVisible: from });

      blockEmit('toggleAddRelatedIssuesForm');
      await wrapper.vm.$nextTick();
      expect(blockProp('isFormVisible')).toBe(to);
    });

    it('resets form and hides it', async () => {
      createWrapper({
        inputValue: 'some input value',
        isFormVisible: true,
        state: { pendingReferences: ['135', '246'] },
      });
      blockEmit('addIssuableFormCancel');
      await wrapper.vm.$nextTick();

      expect(blockProp('isFormVisible')).toBe(false);
      expect(blockProp('inputValue')).toBe('');
      expect(blockProp('pendingReferences')).toEqual([]);
    });
  });

  describe('pending references', () => {
    it('adds pending references', async () => {
      const pendingReferences = ['135', '246'];
      const untouchedRawReferences = ['357', '468'];
      const touchedReference = 'touchedReference';
      createWrapper({ state: { pendingReferences } });
      blockEmit('addIssuableFormInput', { untouchedRawReferences, touchedReference });
      await wrapper.vm.$nextTick();

      expect(blockProp('pendingReferences')).toEqual(
        pendingReferences.concat(untouchedRawReferences),
      );
      expect(blockProp('inputValue')).toBe(touchedReference);
    });

    it('processes pending references', async () => {
      createWrapper();
      blockEmit('addIssuableFormBlur', '135 246');
      await wrapper.vm.$nextTick();

      expect(blockProp('pendingReferences')).toEqual(['135', '246']);
      expect(blockProp('inputValue')).toBe('');
    });

    it('removes pending reference', async () => {
      createWrapper({ state: { pendingReferences: ['135', '246', '357'] } });
      blockEmit('pendingIssuableRemoveRequest', 1);
      await wrapper.vm.$nextTick();

      expect(blockProp('pendingReferences')).toEqual(['135', '357']);
    });
  });

  describe('remove related issue', () => {
    beforeEach(async () => {
      mockAxios.onGet(propsData.endpoint).replyOnce(httpStatusCodes.OK, [issue1, issue2]);
      createWrapper();
      await axios.waitForAll();
    });

    it('removes related issue', async () => {
      mockAxios
        .onDelete(`${propsData.endpoint}/${issue1.vulnerabilityLinkId}`)
        .replyOnce(httpStatusCodes.OK);
      blockEmit('relatedIssueRemoveRequest', issue1.id);
      await axios.waitForAll();

      expect(mockAxios.history.delete).toHaveLength(1);
      expect(blockProp('relatedIssues')).toMatchObject([issue2]);
    });

    it('shows error message if related issue could not be removed', async () => {
      mockAxios
        .onDelete(`${propsData.endpoint}/${issue1.vulnerabilityLinkId}`)
        .replyOnce(httpStatusCodes.SERVICE_UNAVAILABLE);
      blockEmit('relatedIssueRemoveRequest', issue1.id);
      await axios.waitForAll();

      expect(mockAxios.history.delete).toHaveLength(1);
      expect(blockProp('relatedIssues')).toMatchObject([issue1, issue2]);
      expect(createFlash).toHaveBeenCalledTimes(1);
    });
  });
});
