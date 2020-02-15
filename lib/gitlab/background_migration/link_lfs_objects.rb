# frozen_string_literal: true

module Gitlab
  module BackgroundMigration
    # Create missing LfsObjectsProject records for forks
    class LinkLfsObjects
      # Model definition used for migration
      class ForkNetworkMember < ActiveRecord::Base
        self.table_name = 'fork_network_members'

        def self.with_non_existing_lfs_objects
          joins('JOIN lfs_objects_projects lop ON fork_network_members.forked_from_project_id = lop.project_id')
            .where(
              <<~SQL
                NOT EXISTS (
                  SELECT 1
                  FROM lfs_objects_projects
                  WHERE lfs_objects_projects.project_id = fork_network_members.project_id
                  AND lfs_objects_projects.lfs_object_id = lop.lfs_object_id
                )
              SQL
            )
        end
      end

      def perform(start_id, end_id)
        select_query =
          ForkNetworkMember
            .select('lop.lfs_object_id, fork_network_members.project_id')
            .with_non_existing_lfs_objects
            .where(project_id: start_id..end_id)

        return if select_query.empty?

        execute <<-SQL
          INSERT INTO lfs_objects_projects (lfs_object_id, project_id)
          #{select_query.to_sql}
        SQL
      end

      private

      def execute(sql)
        ::ActiveRecord::Base.connection.execute(sql)
      end
    end
  end
end
