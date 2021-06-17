# frozen_string_literal: true

module API
  module Ci
    class Minutes < ::API::Base
      feature_category :utilization

      before { authenticated_as_admin! }

      resource :namespaces, requirements: ::API::API::NAMESPACE_OR_PROJECT_REQUIREMENTS do
        desc 'Create a CI Minutes purchase record for the namespace' do
          success ::EE::API::Entities::Ci::Minutes::AdditionalPack
        end
        params do
          requires :id, type: String, desc: 'The ID of a namespace'
          requires :number_of_minutes, type: Integer, desc: 'Number of additional minutes purchased'
          requires :expires_at, type: Date, desc: 'The expiry date for the purchase'
          requires :purchase_xid, type: String, desc: 'Purchase ID for the additional minutes'
        end
        post ':id/minutes' do
          namespace = find_namespace(params[:id])
          not_found!('Namespace') unless namespace

          result = ::Ci::Minutes::AdditionalPacks::CreateService.new(current_user, namespace, params).execute

          if result[:status] == :success
            present result[:additional_pack], with: ::EE::API::Entities::Ci::Minutes::AdditionalPack
          else
            bad_request!(result[:message])
          end
        end
      end
    end
  end
end
