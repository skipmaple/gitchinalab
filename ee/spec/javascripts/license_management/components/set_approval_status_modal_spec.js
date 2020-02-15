import Vue from 'vue';
import Vuex from 'vuex';

import SetApprovalModal from 'ee/vue_shared/license_management/components/set_approval_status_modal.vue';
import { LICENSE_APPROVAL_STATUS } from 'ee/vue_shared/license_management/constants';
import { trimText } from 'spec/helpers/text_helper';
import { mountComponentWithStore } from 'spec/helpers/vue_mount_component_helper';
import { licenseReport } from 'ee_spec/license_management/mock_data';

describe('SetApprovalModal', () => {
  const Component = Vue.extend(SetApprovalModal);

  let vm;
  let store;
  let actions;

  beforeEach(() => {
    actions = {
      resetLicenseInModal: jasmine.createSpy('resetLicenseInModal'),
      approveLicense: jasmine.createSpy('approveLicense'),
      blacklistLicense: jasmine.createSpy('blacklistLicense'),
    };

    store = new Vuex.Store({
      modules: {
        licenseManagement: {
          namespaced: true,
          state: {
            currentLicenseInModal: licenseReport[0],
            canManageLicenses: true,
          },
          actions,
        },
      },
    });

    vm = mountComponentWithStore(Component, { store });
  });

  afterEach(() => {
    vm.$destroy();
  });

  describe('for approved license', () => {
    beforeEach(done => {
      store.replaceState({
        licenseManagement: {
          currentLicenseInModal: {
            ...licenseReport[0],
            approvalStatus: LICENSE_APPROVAL_STATUS.APPROVED,
          },
          canManageLicenses: true,
        },
      });
      Vue.nextTick(done);
    });

    describe('computed', () => {
      it('headerTitleText returns `License review', () => {
        expect(vm.headerTitleText).toBe('License review');
      });

      it('canApprove is false', () => {
        expect(vm.canApprove).toBe(false);
      });

      it('canBlacklist is true', () => {
        expect(vm.canBlacklist).toBe(true);
      });
    });

    describe('template correctly', () => {
      it('renders modal title', () => {
        const headerEl = vm.$el.querySelector('.modal-title');

        expect(headerEl).not.toBeNull();
        expect(headerEl.innerText.trim()).toBe('License review');
      });

      it('renders no Allow button in modal footer', () => {
        const footerButton = vm.$el.querySelector('.js-modal-primary-action');

        expect(footerButton).toBeNull();
      });

      it('renders Deny button in modal footer', () => {
        const footerButton = vm.$el.querySelector('.js-modal-secondary-action');

        expect(footerButton).not.toBeNull();
        expect(footerButton.innerText.trim()).toBe('Deny');
      });
    });
  });

  describe('for unapproved license', () => {
    beforeEach(done => {
      store.replaceState({
        licenseManagement: {
          currentLicenseInModal: {
            ...licenseReport[0],
            approvalStatus: undefined,
          },
          canManageLicenses: true,
        },
      });
      Vue.nextTick(done);
    });

    describe('computed', () => {
      it('headerTitleText returns `License review`', () => {
        expect(vm.headerTitleText).toBe('License review');
      });

      it('canApprove is true', () => {
        expect(vm.canApprove).toBe(true);
      });

      it('canBlacklist is true', () => {
        expect(vm.canBlacklist).toBe(true);
      });
    });

    describe('template', () => {
      it('renders modal title', () => {
        const headerEl = vm.$el.querySelector('.modal-title');

        expect(headerEl).not.toBeNull();
        expect(headerEl.innerText.trim()).toBe('License review');
      });

      it('renders Allow button in modal footer', () => {
        const footerButton = vm.$el.querySelector('.js-modal-primary-action');

        expect(footerButton).not.toBeNull();
        expect(footerButton.innerText.trim()).toBe('Allow');
      });

      it('renders Deny button in modal footer', () => {
        const footerButton = vm.$el.querySelector('.js-modal-secondary-action');

        expect(footerButton).not.toBeNull();
        expect(footerButton.innerText.trim()).toBe('Deny');
      });
    });
  });

  describe('for blacklisted license', () => {
    beforeEach(done => {
      store.replaceState({
        licenseManagement: {
          currentLicenseInModal: {
            ...licenseReport[0],
            approvalStatus: LICENSE_APPROVAL_STATUS.BLACKLISTED,
          },
          canManageLicenses: true,
        },
      });
      Vue.nextTick(done);
    });

    describe('computed', () => {
      it('headerTitleText returns `License review`', () => {
        expect(vm.headerTitleText).toBe('License review');
      });

      it('canApprove is true', () => {
        expect(vm.canApprove).toBe(true);
      });

      it('canBlacklist is false', () => {
        expect(vm.canBlacklist).toBe(false);
      });
    });

    describe('template', () => {
      it('renders modal title', () => {
        const headerEl = vm.$el.querySelector('.modal-title');

        expect(headerEl).not.toBeNull();
        expect(headerEl.innerText.trim()).toBe('License review');
      });

      it('renders Allow button in modal footer', () => {
        const footerButton = vm.$el.querySelector('.js-modal-primary-action');

        expect(footerButton).not.toBeNull();
        expect(footerButton.innerText.trim()).toBe('Allow');
      });

      it('renders no Deny button in modal footer', () => {
        const footerButton = vm.$el.querySelector('.js-modal-secondary-action');

        expect(footerButton).toBeNull();
      });
    });
  });

  describe('for user without the rights to manage licenses', () => {
    beforeEach(done => {
      store.replaceState({
        licenseManagement: {
          currentLicenseInModal: {
            ...licenseReport[0],
            approvalStatus: undefined,
          },
          canManageLicenses: false,
        },
      });
      Vue.nextTick(done);
    });

    describe('computed', () => {
      it('headerTitleText returns `License details`', () => {
        expect(vm.headerTitleText).toBe('License details');
      });

      it('canApprove is false', () => {
        expect(vm.canApprove).toBe(false);
      });

      it('canBlacklist is false', () => {
        expect(vm.canBlacklist).toBe(false);
      });
    });

    describe('template', () => {
      it('renders modal title', () => {
        const headerEl = vm.$el.querySelector('.modal-title');

        expect(headerEl).not.toBeNull();
        expect(headerEl.innerText.trim()).toBe('License details');
      });

      it('renders no Approve button in modal footer', () => {
        const footerButton = vm.$el.querySelector('.js-modal-primary-action');

        expect(footerButton).toBeNull();
      });

      it('renders no Blacklist button in modal footer', () => {
        const footerButton = vm.$el.querySelector('.js-modal-secondary-action');

        expect(footerButton).toBeNull();
      });
    });
  });

  describe('Modal Body', () => {
    it('renders the license name', () => {
      const licenseName = vm.$el.querySelector('.js-license-name');

      expect(licenseName).not.toBeNull();
      expect(trimText(licenseName.innerText)).toBe(`License: ${licenseReport[0].name}`);
    });

    it('renders the license url with link', () => {
      const licenseName = vm.$el.querySelector('.js-license-url');

      expect(licenseName).not.toBeNull();
      expect(trimText(licenseName.innerText)).toBe(`URL: ${licenseReport[0].url}`);

      const licenseLink = licenseName.querySelector('a');

      expect(licenseLink.getAttribute('href')).toBe(licenseReport[0].url);
      expect(trimText(licenseLink.innerText)).toBe(licenseReport[0].url);
    });

    it('renders the license url', () => {
      const licenseName = vm.$el.querySelector('.js-license-packages');

      expect(licenseName).not.toBeNull();
      expect(trimText(licenseName.innerText)).toBe('Packages: Used by pg, puma, foo, and 2 more');
    });
  });

  describe('interaction', () => {
    describe('triggering resetLicenseInModal on canceling', () => {
      it('by clicking the cancel button', () => {
        const linkEl = vm.$el.querySelector('.js-modal-cancel-action');
        linkEl.click();

        expect(actions.resetLicenseInModal).toHaveBeenCalled();
      });

      it('triggering resetLicenseInModal by clicking the X button', () => {
        const linkEl = vm.$el.querySelector('.js-modal-close-action');
        linkEl.click();

        expect(actions.resetLicenseInModal).toHaveBeenCalled();
      });
    });

    describe('triggering approveLicense on approving', () => {
      it('by clicking the confirmation button', () => {
        const linkEl = vm.$el.querySelector('.js-modal-primary-action');
        linkEl.click();

        expect(actions.approveLicense).toHaveBeenCalledWith(
          jasmine.any(Object),
          store.state.licenseManagement.currentLicenseInModal,
          undefined,
        );
      });
    });

    describe('triggering blacklistLicense on blacklisting', () => {
      it('by clicking the confirmation button', () => {
        const linkEl = vm.$el.querySelector('.js-modal-secondary-action');
        linkEl.click();

        expect(actions.blacklistLicense).toHaveBeenCalledWith(
          jasmine.any(Object),
          store.state.licenseManagement.currentLicenseInModal,
          undefined,
        );
      });
    });
  });

  it('does not render a XSS link', done => {
    // eslint-disable-next-line no-script-url
    const badURL = 'javascript:alert("")';

    store.replaceState({
      licenseManagement: {
        currentLicenseInModal: {
          ...licenseReport[0],
          url: badURL,
          approvalStatus: LICENSE_APPROVAL_STATUS.APPROVED,
        },
      },
    });
    Vue.nextTick()
      .then(() => {
        const licenseName = vm.$el.querySelector('.js-license-url');

        expect(licenseName).not.toBeNull();
        expect(trimText(licenseName.innerText)).toBe(`URL: ${badURL}`);

        expect(licenseName.querySelector('a')).toBeNull();
        expect(licenseName.querySelector('span')).not.toBeNull();
        expect(licenseName.querySelector('span').innerText).toBe(badURL);
      })
      .then(done)
      .catch(done.fail);
  });
});
