# frozen_string_literal: true

# For each project in range,
# indexing the repository, wiki and its nested models
# (e.g. )issues and notes etc.)
# Intended for full site indexing.
class ElasticFullIndexWorker # rubocop:disable Scalability/IdempotentWorker
  include ApplicationWorker

  sidekiq_options retry: 2
  feature_category :global_search

  def perform(start_id, end_id)
    return true unless Gitlab::CurrentSettings.elasticsearch_indexing?

    Project.id_in(start_id..end_id).find_in_batches do |batch|
      Gitlab::Elastic::BulkIndexer::InitialProcessor.backfill_projects!(*batch)
    end
  end
end
