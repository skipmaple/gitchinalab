# frozen_string_literal: true

require 'spec_helper'

describe Gitlab::Geo::Replication::LfsTransfer do
  include ::EE::GeoHelpers

  let_it_be(:primary_node) { create(:geo_node, :primary) }
  let_it_be(:secondary_node) { create(:geo_node) }
  let_it_be(:lfs_object) { create(:lfs_object, :with_file, :correct_oid) }

  subject do
    described_class.new(lfs_object)
  end

  context '#download_from_primary' do
    before do
      stub_current_geo_node(secondary_node)
    end

    context 'when the destination filename is a directory' do
      it 'returns a failed result' do
        allow(lfs_object).to receive(:file).and_return(double(path: '/tmp'))

        result = subject.download_from_primary

        expect_result(result, success: false, bytes_downloaded: 0, primary_missing_file: false)
      end
    end

    context 'when the HTTP response is successful' do
      it 'returns a successful result' do
        content = lfs_object.file.read
        size = content.bytesize
        stub_request(:get, subject.resource_url).to_return(status: 200, body: content)

        result = subject.download_from_primary

        expect_result(result, success: true, bytes_downloaded: size, primary_missing_file: false)

        stat = File.stat(lfs_object.file.path)

        expect(stat.size).to eq(size)
        expect(stat.mode & 0777).to eq(0666 - File.umask)
        expect(File.binread(lfs_object.file.path)).to eq(content)
      end
    end

    context 'when the HTTP response is unsuccessful' do
      context 'when the HTTP response indicates a missing file on the primary' do
        it 'returns a failed result indicating primary_missing_file' do
          stub_request(:get, subject.resource_url)
            .to_return(status: 404,
                       headers: { content_type: 'application/json' },
                       body: { geo_code: Gitlab::Geo::Replication::FILE_NOT_FOUND_GEO_CODE }.to_json)

          result = subject.download_from_primary

          expect_result(result, success: false, bytes_downloaded: 0, primary_missing_file: true)
        end
      end

      context 'when the HTTP response does not indicate a missing file on the primary' do
        it 'returns a failed result' do
          stub_request(:get, subject.resource_url).to_return(status: 404, body: 'Not found')

          result = subject.download_from_primary

          expect_result(result, success: false, bytes_downloaded: 0, primary_missing_file: false)
        end
      end
    end

    context 'when Tempfile fails' do
      it 'returns a failed result' do
        expect(Tempfile).to receive(:new).and_raise(Errno::ENAMETOOLONG)

        result = subject.download_from_primary

        expect(result.success).to eq(false)
        expect(result.bytes_downloaded).to eq(0)
      end
    end

    context "invalid path" do
      it 'logs an error if the destination directory could not be created' do
        allow(lfs_object).to receive(:file).and_return(double(path: '/foo/bar'))

        allow(FileUtils).to receive(:mkdir_p) { raise Errno::EEXIST }

        expect(subject).to receive(:log_error).with("Unable to create directory /foo: File exists").once
        expect(subject).to receive(:log_error).with("Skipping transfer as we cannot create the destination directory").once
        result = subject.download_from_primary

        expect(result.success).to eq(false)
        expect(result.bytes_downloaded).to eq(0)
      end
    end

    context 'when the checksum of the downloaded file does not match' do
      it 'returns a failed result' do
        bad_content = 'corrupted!!!'
        stub_request(:get, subject.resource_url)
          .to_return(status: 200, body: bad_content)

        result = subject.download_from_primary

        expect_result(result, success: false, bytes_downloaded: bad_content.bytesize, primary_missing_file: false)
      end
    end
  end

  def expect_result(result, success:, bytes_downloaded:, primary_missing_file:)
    expect(result.success).to eq(success)
    expect(result.bytes_downloaded).to eq(bytes_downloaded)
    expect(result.primary_missing_file).to eq(primary_missing_file)

    # Sanity check to help ensure a valid test
    expect(success).not_to be_nil
    expect(primary_missing_file).not_to be_nil
  end
end
