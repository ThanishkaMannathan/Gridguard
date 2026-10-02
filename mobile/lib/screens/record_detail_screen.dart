import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/record_detail_provider.dart';
import '../core/theme.dart';
import '../widgets/error_view.dart';
import '../widgets/waveform_chart.dart';
import 'report_screen.dart';

/// Wrapper that creates an isolated RecordDetailProvider for this screen.
class RecordDetailScreen extends StatelessWidget {
  final String recordId;

  const RecordDetailScreen({Key? key, required this.recordId}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => RecordDetailProvider(),
      child: _RecordDetailBody(recordId: recordId),
    );
  }
}

class _RecordDetailBody extends StatefulWidget {
  final String recordId;
  const _RecordDetailBody({Key? key, required this.recordId}) : super(key: key);

  @override
  State<_RecordDetailBody> createState() => _RecordDetailBodyState();
}

class _RecordDetailBodyState extends State<_RecordDetailBody> {
  @override
  void initState() {
    super.initState();
    // Load immediately after the first frame so the Provider is ready
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) {
        context.read<RecordDetailProvider>().fetchRecordDetail(widget.recordId);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.bgDeep,
      appBar: AppBar(
        title: Text(
          widget.recordId,
          style: const TextStyle(fontFamily: 'monospace', fontSize: 14),
        ),
        actions: [
          Consumer<RecordDetailProvider>(
            builder: (context, provider, _) {
              if (provider.record == null) return const SizedBox.shrink();
              return IconButton(
                icon: const Icon(Icons.picture_as_pdf_outlined),
                tooltip: 'Generate Report',
                onPressed: () => Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ReportScreen(
                      recordId: widget.recordId,
                      diagnosisData: provider.diagnosisResult,
                    ),
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: Consumer<RecordDetailProvider>(
        builder: (context, provider, _) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator(color: AppTheme.signalCyan));
          }
          if (provider.errorMessage != null) {
            return ErrorView(
              message: provider.errorMessage!,
              onRetry: () => provider.fetchRecordDetail(widget.recordId),
            );
          }
          final record = provider.record;
          if (record == null) return const SizedBox.shrink();

          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildHeader(record),
                const SizedBox(height: 20),
                _buildMetricsGrid(record),
                const SizedBox(height: 20),
                _buildWaveforms(record),
                const SizedBox(height: 20),
                _buildAnalysisSection(context, provider),
                const SizedBox(height: 48),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildHeader(Map<String, dynamic> record) {
    final isHealthy = record['fault_type'] == 'NONE';
    final severityColor = isHealthy ? AppTheme.signalGreen : AppTheme.signalRed;
    final faultTypeLabel = record['fault_type_label']?.toString() ?? record['fault_type']?.toString() ?? 'Unknown';

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Expanded(
          child: Text(
            faultTypeLabel,
            style: const TextStyle(
              fontSize: 22,
              fontWeight: FontWeight.bold,
              color: AppTheme.inkPrimary,
            ),
          ),
        ),
        const SizedBox(width: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
          decoration: BoxDecoration(
            color: severityColor.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(4),
            border: Border.all(color: severityColor.withValues(alpha: 0.4)),
          ),
          child: Text(
            record['fault_type']?.toString() ?? '',
            style: TextStyle(
              color: severityColor,
              fontFamily: 'monospace',
              fontWeight: FontWeight.bold,
              fontSize: 13,
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildMetricsGrid(Map<String, dynamic> record) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final tileWidth = (constraints.maxWidth - 16) / 2;
        return Wrap(
          spacing: 16,
          runSpacing: 16,
          children: [
            _metricTile('FREQUENCY', '${record['frequency_hz']} Hz', tileWidth),
            _metricTile('DURATION', '${record['duration_ms'] ?? 'N/A'} ms', tileWidth),
            _metricTile('V UNBALANCE', '${record['voltage_unbalance_pct']}%', tileWidth),
            _metricTile('I UNBALANCE', '${record['current_unbalance_pct']}%', tileWidth),
          ],
        );
      },
    );
  }

  Widget _metricTile(String label, String value, double width) {
    return Container(
      width: width,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppTheme.bgPanel,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.borderDefault),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label,
            style: const TextStyle(
              color: AppTheme.inkMuted,
              fontSize: 10,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.0,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            value,
            style: const TextStyle(
              color: AppTheme.inkPrimary,
              fontSize: 18,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildWaveforms(Map<String, dynamic> record) {
    final waveform = record['waveform'];
    if (waveform == null) {
      return const Padding(
        padding: EdgeInsets.symmetric(vertical: 16),
        child: Text('No waveform data for this record.', style: TextStyle(color: AppTheme.inkMuted)),
      );
    }

    final time = waveform['time'] as List<dynamic>? ?? [];
    if (time.isEmpty) return const SizedBox.shrink();

    return Column(
      children: [
        _chartCard(
          WaveformChart(
            title: 'Phase Voltage (V)',
            time: time,
            phaseA: waveform['Va'] as List<dynamic>? ?? [],
            phaseB: waveform['Vb'] as List<dynamic>? ?? [],
            phaseC: waveform['Vc'] as List<dynamic>? ?? [],
            minY: -400,
            maxY: 400,
          ),
        ),
        const SizedBox(height: 16),
        _chartCard(
          WaveformChart(
            title: 'Phase Current (A)',
            time: time,
            phaseA: waveform['Ia'] as List<dynamic>? ?? [],
            phaseB: waveform['Ib'] as List<dynamic>? ?? [],
            phaseC: waveform['Ic'] as List<dynamic>? ?? [],
            minY: -2000,
            maxY: 2000,
          ),
        ),
      ],
    );
  }

  Widget _chartCard(Widget child) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgPanel,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.borderDefault),
      ),
      child: child,
    );
  }

  Widget _buildAnalysisSection(BuildContext context, RecordDetailProvider provider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Padding(
          padding: EdgeInsets.only(bottom: 12),
          child: Text(
            'ANALYSIS & DIAGNOSIS',
            style: TextStyle(
              color: AppTheme.inkMuted,
              fontSize: 11,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.5,
            ),
          ),
        ),
        _buildClassifyCard(provider),
        const SizedBox(height: 16),
        _buildDiagnoseCard(provider),
      ],
    );
  }

  Widget _buildClassifyCard(RecordDetailProvider provider) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgPanel,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.borderDefault),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'ML Classifier',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.inkPrimary),
              ),
              const Spacer(),
              if (provider.isClassifying)
                const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.signalCyan),
                )
              else
                ElevatedButton(
                  onPressed: () => provider.classifyRecord(widget.recordId),
                  child: Text(provider.classificationResult != null ? 'RE-RUN' : 'CLASSIFY'),
                ),
            ],
          ),
          if (provider.classificationError != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: _errorChip(provider.classificationError!),
            ),
          if (provider.classificationResult != null) ...[
            const SizedBox(height: 12),
            Text(
              provider.classificationResult!['predicted_fault_type_label']?.toString() ?? '',
              style: const TextStyle(
                color: AppTheme.signalCyan,
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Confidence: ${((provider.classificationResult!['confidence'] as num? ?? 0) * 100).toStringAsFixed(1)}%',
              style: const TextStyle(color: AppTheme.inkMuted, fontFamily: 'monospace', fontSize: 13),
            ),
            const SizedBox(height: 4),
            Text(
              'Model: ${provider.classificationResult!['model']} · CV accuracy: ${((provider.classificationResult!['model_cv_accuracy'] as num? ?? 0) * 100).toStringAsFixed(1)}%',
              style: const TextStyle(color: AppTheme.inkFaint, fontSize: 11, fontFamily: 'monospace'),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildDiagnoseCard(RecordDetailProvider provider) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppTheme.bgPanel,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: AppTheme.borderDefault),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const Text(
                'AI Diagnosis',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: AppTheme.inkPrimary),
              ),
              const Spacer(),
              if (provider.isDiagnosing)
                const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.signalAmber),
                )
              else
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    foregroundColor: AppTheme.signalAmber,
                    side: const BorderSide(color: AppTheme.signalAmber),
                  ),
                  onPressed: () => provider.diagnoseRecord(widget.recordId),
                  child: Text(provider.diagnosisResult != null ? 'RE-ANALYZE' : 'DIAGNOSE'),
                ),
            ],
          ),
          if (!provider.isDiagnosing && provider.diagnosisResult == null && provider.diagnosisError == null)
            const Padding(
              padding: EdgeInsets.only(top: 12),
              child: Text(
                'Request an AI-grounded diagnosis from the protection knowledge base.',
                style: TextStyle(color: AppTheme.inkMuted, fontSize: 13),
              ),
            ),
          if (provider.diagnosisError != null)
            Padding(
              padding: const EdgeInsets.only(top: 12),
              child: _errorChip(provider.diagnosisError!),
            ),
          if (provider.isDiagnosing)
            const Padding(
              padding: EdgeInsets.only(top: 16),
              child: Text(
                'Calling AI model — this may take up to 60 seconds…',
                style: TextStyle(color: AppTheme.inkMuted, fontSize: 13),
              ),
            ),
          if (provider.diagnosisResult != null && !provider.isDiagnosing) ...[
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: AppTheme.bgDeep,
                borderRadius: BorderRadius.circular(4),
                border: Border.all(color: AppTheme.borderSoft),
              ),
              child: Text(
                provider.diagnosisResult!['diagnosis']?.toString() ?? '',
                style: const TextStyle(
                  color: AppTheme.inkPrimary,
                  height: 1.6,
                  fontSize: 13,
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _errorChip(String message) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: AppTheme.signalRed.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(4),
        border: Border.all(color: AppTheme.signalRed.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          const Icon(Icons.error_outline, color: AppTheme.signalRed, size: 16),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: const TextStyle(color: AppTheme.signalRed, fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }
}
