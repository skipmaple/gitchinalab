# frozen_string_literal: true

require 'spec_helper'

describe ApprovalProjectRule do
  subject { create(:approval_project_rule) }

  describe '.regular' do
    it 'returns non-report_approver records' do
      rules = create_list(:approval_project_rule, 2)
      create(:approval_project_rule, :security_report)

      expect(described_class.regular).to contain_exactly(*rules)
    end
  end

  describe '.code_ownerscope' do
    it 'returns nothing' do
      create_list(:approval_project_rule, 2)

      expect(described_class.code_owner).to be_empty
    end
  end

  describe '#regular?' do
    let(:security_approver_rule) { build(:approval_project_rule, :security_report) }

    it 'returns true for regular rules' do
      expect(subject.regular?).to eq(true)
    end

    it 'returns false for report_approver rules' do
      expect(security_approver_rule.regular?). to eq(false)
    end
  end

  describe '#code_owner?' do
    it 'returns false' do
      expect(subject.code_owner?).to eq(false)
    end
  end

  describe '#report_approver?' do
    let(:security_approver_rule) { build(:approval_project_rule, :security_report) }

    it 'returns false for regular rules' do
      expect(subject.report_approver?).to eq(false)
    end

    it 'returns true for report_approver rules' do
      expect(security_approver_rule.report_approver?). to eq(true)
    end
  end

  describe '#rule_type' do
    it 'returns the regular type for regular rules' do
      expect(build(:approval_project_rule).rule_type).to eq('regular')
    end

    it 'returns the report_approver type for security report approvers rules' do
      expect(build(:approval_project_rule, :security_report).rule_type).to eq('report_approver')
    end
  end

  describe "#apply_report_approver_rules_to" do
    let(:project) { merge_request.target_project }
    let(:merge_request) { create(:merge_request) }
    let(:user) { create(:user) }
    let(:group) { create(:group) }

    before do
      subject.users << user
      subject.groups << group
    end

    ApprovalProjectRule::REPORT_TYPES_BY_DEFAULT_NAME.each do |name, value|
      context "when the project rule is for a `#{name}`" do
        subject { create(:approval_project_rule, value, :requires_approval, project: project) }
        let!(:result) { subject.apply_report_approver_rules_to(merge_request) }

        specify { expect(merge_request.reload.approval_rules).to match_array([result]) }
        specify { expect(result.users).to match_array([user]) }
        specify { expect(result.groups).to match_array([group]) }
      end
    end
  end
end
