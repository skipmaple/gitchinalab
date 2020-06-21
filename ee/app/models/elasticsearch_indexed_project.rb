# frozen_string_literal: true

class ElasticsearchIndexedProject < ApplicationRecord
  include ElasticsearchIndexedContainer
  include EachBatch

  self.primary_key = :project_id

  belongs_to :project

  validates :project_id, presence: true, uniqueness: true

  def self.target_attr_name
    :project_id
  end

  private

  def index
    return unless Gitlab::CurrentSettings.elasticsearch_indexing? && project.searchable?

    Gitlab::Elastic::BulkIndexer::InitialProcessor.backfill_projects!(project)
  end

  def delete_from_index
    return unless Gitlab::CurrentSettings.elasticsearch_indexing? && project.searchable?

    ElasticDeleteProjectWorker.perform_async(project.id, project.es_id)
  end
end
