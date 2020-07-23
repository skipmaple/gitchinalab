# frozen_string_literal: true

require 'spec_helper'

RSpec.describe Gitlab::ExpiringSubscriptionMessage do
  include ActionView::Helpers::SanitizeHelper

  describe 'message' do
    subject { strip_tags(message) }

    let(:subscribable) { double(:license) }
    let(:namespace) { nil }
    let(:message) do
      described_class.new(
        subscribable: subscribable,
        signed_in: true,
        is_admin: true,
        namespace: namespace
      ).message
    end
    let(:grace_period_effective_from) { expired_date - 35.days }
    let(:today) { Time.utc(2020, 3, 7, 10) }
    let(:expired_date) { Time.utc(2020, 3, 9, 10).to_date }

    before do
      allow_any_instance_of(Gitlab::ExpiringSubscriptionMessage).to receive(:grace_period_effective_from).and_return(grace_period_effective_from)
    end

    context 'subscribable installed' do
      let(:auto_renew) { false }

      before do
        allow(subscribable).to receive(:plan).and_return('ultimate')
        allow(subscribable).to receive(:expires_at).and_return(expired_date)
        allow(subscribable).to receive(:auto_renew?).and_return(auto_renew)
      end

      context 'subscribable should not notify admins' do
        it 'returns nil' do
          allow(subscribable).to receive(:notify_admins?).and_return(false)
          allow(subscribable).to receive(:notify_users?).and_return(false)

          expect(subject).to be nil
        end
      end

      context 'subscribable should notify admins' do
        before do
          allow(subscribable).to receive(:notify_admins?).and_return(true)
        end

        context 'admin signed in' do
          let(:signed_in) { true }
          let(:is_admin) { true }

          context 'subscribable expired' do
            let(:expired_date) { Time.utc(2020, 3, 1, 10).to_date }

            before do
              allow(subscribable).to receive(:expired?).and_return(true)
              allow(subscribable).to receive(:expires_at).and_return(expired_date)
            end

            context 'when it blocks changes' do
              before do
                allow(subscribable).to receive(:will_block_changes?).and_return(true)
              end

              context 'when it is currently blocking changes' do
                before do
                  allow(subscribable).to receive(:block_changes?).and_return(true)
                  allow(subscribable).to receive(:block_changes_at).and_return(expired_date)
                end

                it 'has a nice subject' do
                  Timecop.freeze(today) do
                    expect(subject).to include('Your subscription has been downgraded.')
                  end
                end

                context 'no namespace' do
                  it 'has an expiration blocking message' do
                    Timecop.freeze(today) do
                      expect(subject).to include("You didn't renew your Ultimate subscription so it was downgraded to the GitLab Core Plan")
                    end
                  end
                end

                context 'with namespace' do
                  let(:namespace) { double(:namespace, name: 'No Limit Records') }

                  it 'has an expiration blocking message' do
                    Timecop.freeze(today) do
                      expect(subject).to include("You didn't renew your Ultimate subscription for No Limit Records so it was downgraded to the free plan")
                    end
                  end

                  context 'is auto_renew' do
                    let(:auto_renew) { true }

                    it 'has a nice subject' do
                      Timecop.freeze(today) do
                        expect(subject).to include('Something went wrong with your automatic subscription renewal')
                      end
                    end

                    it 'has an expiration blocking message' do
                      Timecop.freeze(today) do
                        expect(subject).to include("We tried to automatically renew your Ultimate subscription for No Limit Records on 2020-03-01 but something went wrong so your subscription was downgraded to the free plan. Don't worry, your data is safe. We suggest you check your payment method and get in touch with our support team (support@gitlab.com). They'll gladly help with your subscription renewal.")
                      end
                    end
                  end
                end
              end

              context 'when it is not currently blocking changes' do
                before do
                  allow(subscribable).to receive(:block_changes?).and_return(false)
                end

                it 'has a nice subject' do
                  allow(subscribable).to receive(:will_block_changes?).and_return(false)

                  Timecop.freeze(today) do
                    expect(subject).to include('Your subscription expired!')
                  end
                end

                it 'has an expiration blocking message' do
                  allow(subscribable).to receive(:block_changes_at).and_return(Time.utc(2020, 3, 9, 10).to_date)
                  allow(subscribable).to receive(:is_a?).with(::License).and_return(true)

                  Timecop.freeze(today) do
                    expect(subject).to include('No worries, you can still use all the Ultimate features for now. You have 2 days to renew your subscription.')
                  end
                end
              end
            end
          end

          context 'subscribable is expiring soon' do
            before do
              allow(subscribable).to receive(:expired?).and_return(false)
              allow(subscribable).to receive(:will_block_changes?).and_return(true)
              allow(subscribable).to receive(:block_changes_at).and_return(expired_date)
            end

            it 'has a nice subject' do
              Timecop.freeze(today) do
                expect(subject).to include('Your subscription will expire in 2 days')
              end
            end

            context 'without namespace' do
              it 'has an expiration blocking message' do
                Timecop.freeze(today) do
                  expect(subject).to include('Your Ultimate subscription will expire on 2020-03-09. After that, you will not to be able to create issues or merge requests as well as many other features.')
                end
              end
            end

            context 'with namespace' do
              let(:namespace) { double(:namespace, name: 'No Limit Records') }

              it 'has gold plan specific messaging' do
                allow(subscribable).to receive(:plan).and_return('gold')

                Timecop.freeze(today) do
                  expect(subject).to include('Your Gold subscription for No Limit Records will expire on 2020-03-09. After that, you will not to be able to use merge approvals or epics as well as many security features.')
                end
              end

              it 'has silver plan specific messaging' do
                allow(subscribable).to receive(:plan).and_return('silver')

                Timecop.freeze(today) do
                  expect(subject).to include('Your Silver subscription for No Limit Records will expire on 2020-03-09. After that, you will not to be able to use merge approvals or epics as well as many other features.')
                end
              end

              it 'has bronze plan specific messaging' do
                allow(subscribable).to receive(:plan).and_return('bronze')

                Timecop.freeze(today) do
                  expect(subject).to include('Your Bronze subscription for No Limit Records will expire on 2020-03-09. After that, you will not to be able to use merge approvals or code quality as well as many other features.')
                end
              end

              context 'is auto_renew nil' do
                let(:auto_renew) { nil }

                it 'returns nil' do
                  expect(subject).to be nil
                end
              end

              context 'is auto_renew' do
                let(:auto_renew) { true }

                it 'returns nil' do
                  expect(subject).to be nil
                end
              end
            end
          end

          context 'subscribable expired a long time ago' do
            let(:expired_date) { today.to_date - 1.year }
            let(:grace_period_effective_from) { today.to_date - 25.days }

            before do
              allow(subscribable).to receive(:expires_at).and_return(expired_date)
              allow(subscribable).to receive(:block_changes_at).and_return(expired_date)
              allow(subscribable).to receive(:expired?).and_return(true)
              allow(subscribable).to receive(:will_block_changes?).and_return(true)
              allow(subscribable).to receive(:block_changes?).and_return(true)
            end

            context 'and is past the cutoff date' do
              let(:grace_period_effective_from) { today.to_date - 40.days }

              it 'has a nice subject' do
                Timecop.freeze(today) do
                  expect(subject).to include('Your subscription has been downgraded')
                end
              end
            end

            context 'and not past the cutoff date' do
              it 'has a nice subject' do
                Timecop.freeze(today) do
                  expect(subject).to include('Your subscription will expire in 5 days')
                end
              end
            end
          end
        end
      end
    end

    context 'no subscribable installed' do
      let(:subscribable) { nil }

      it { is_expected.to be_blank }
    end
  end
end
