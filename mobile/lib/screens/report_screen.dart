import 'dart:io';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:share_plus/share_plus.dart';
import '../core/api_service.dart';
import '../core/theme.dart';
import '../widgets/error_view.dart';

class ReportScreen extends StatefulWidget {
  final String recordId;
  final Map<String, dynamic>? diagnosisData;

  const ReportScreen({
    Key? key,
    required this.recordId,
    this.diagnosisData,
  }) : super(key: key);

  @override
  State<ReportScreen> createState() => _ReportScreenState();
}

class _ReportScreenState extends State<ReportScreen> {
  final ApiService _apiService = ApiService();
  bool _isLoading = true;
  String? _errorMessage;
  String? _markdownContent;
  bool _isDownloading = false;

  @override
  void initState() {
    super.initState();
    _fetchReport();
  }

  @override
  void dispose() {
    _apiService.dispose();
    super.dispose();
  }

  Future<void> _fetchReport() async {
    if (!mounted) return;
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final report = await _apiService.getReportJson(
        widget.recordId,
        diagnosisData: widget.diagnosisData,
      );
      if (mounted) {
        setState(() {
          _markdownContent = report['markdown']?.toString();
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString().replaceFirst('Exception: ', '');
        });
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _downloadPdf() async {
    setState(() => _isDownloading = true);

    try {
      final bytes = await _apiService.getReportPdfBytes(
        widget.recordId,
        diagnosisData: widget.diagnosisData,
      );
      final dir = await getApplicationDocumentsDirectory();
      final file = File('${dir.path}/gridguard_report_${widget.recordId}.pdf');
      await file.writeAsBytes(bytes);

      if (mounted) {
        await Share.shareXFiles(
          [XFile(file.path, mimeType: 'application/pdf')],
          subject: 'GridGuard Fault Report — ${widget.recordId}',
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Download failed: ${e.toString().replaceFirst("Exception: ", "")}'),
            backgroundColor: AppTheme.signalRed,
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isDownloading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgDeep,
      appBar: AppBar(
        title: const Text('FAULT REPORT'),
        actions: [
          if (_markdownContent != null && !_isLoading)
            Padding(
              padding: const EdgeInsets.only(right: 8.0),
              child: _isDownloading
                  ? const Center(
                      child: SizedBox(
                        width: 20,
                        height: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.inkPrimary),
                      ),
                    )
                  : IconButton(
                      icon: const Icon(Icons.download_rounded),
                      onPressed: _downloadPdf,
                      tooltip: 'Download PDF',
                    ),
            ),
        ],
      ),
      body: _buildBody(),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircularProgressIndicator(color: AppTheme.signalCyan),
            SizedBox(height: 16),
            Text('Generating report…', style: TextStyle(color: AppTheme.inkMuted)),
          ],
        ),
      );
    }

    if (_errorMessage != null) {
      return ErrorView(message: _errorMessage!, onRetry: _fetchReport);
    }

    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: AppTheme.bgPanel,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppTheme.borderDefault),
            ),
            child: Row(
              children: [
                const Icon(Icons.description_outlined, color: AppTheme.signalCyan, size: 20),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Report for ${widget.recordId}',
                    style: const TextStyle(
                      color: AppTheme.inkPrimary,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          // Report content
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppTheme.bgPanel,
              borderRadius: BorderRadius.circular(8),
              border: Border.all(color: AppTheme.borderDefault),
            ),
            child: SelectableText(
              _markdownContent ?? 'No content available.',
              style: const TextStyle(
                fontFamily: 'monospace',
                fontSize: 11,
                color: AppTheme.inkPrimary,
                height: 1.6,
              ),
            ),
          ),
          const SizedBox(height: 48),
        ],
      ),
    );
  }
}
