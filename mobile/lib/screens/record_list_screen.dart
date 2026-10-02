import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/app_state_provider.dart';
import '../core/theme.dart';
import '../widgets/status_badge.dart';
import '../widgets/error_view.dart';
import 'record_detail_screen.dart';

class RecordListScreen extends StatefulWidget {
  const RecordListScreen({Key? key}) : super(key: key);

  @override
  State<RecordListScreen> createState() => _RecordListScreenState();
}

class _RecordListScreenState extends State<RecordListScreen> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final provider = Provider.of<AppStateProvider>(context, listen: false);
      provider.checkHealth();
      provider.fetchRecords();
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('GRIDGUARD', style: TextStyle(letterSpacing: 2)),
        actions: [
          Consumer<AppStateProvider>(
            builder: (context, provider, _) => Center(
              child: Padding(
                padding: const EdgeInsets.only(right: 16.0),
                child: StatusBadge(isOnline: provider.isBackendOnline),
              ),
            ),
          ),
        ],
      ),
      body: Consumer<AppStateProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading && provider.records.isEmpty) {
            return const Center(child: CircularProgressIndicator(color: AppTheme.signalCyan));
          }

          if (provider.errorMessage != null && provider.records.isEmpty) {
            return ErrorView(
              message: provider.errorMessage!,
              onRetry: () => provider.fetchRecords(),
            );
          }

          return Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildFilterBar(provider),
              Expanded(
                child: ListView.builder(
                  itemCount: provider.records.length,
                  padding: const EdgeInsets.all(16),
                  itemBuilder: (context, index) {
                    final record = provider.records[index];
                    return _buildRecordCard(context, record);
                  },
                ),
              ),
            ],
          );
        },
      ),
    );
  }

  Widget _buildFilterBar(AppStateProvider provider) {
    if (provider.faultTypes.isEmpty) return const SizedBox.shrink();

    return Container(
      width: double.infinity,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: AppTheme.bgPanel,
        border: Border(bottom: BorderSide(color: AppTheme.borderDefault)),
      ),
      child: Row(
        children: [
          const Icon(Icons.filter_list, color: AppTheme.inkMuted, size: 20),
          const SizedBox(width: 8),
          const Text('FILTER:', style: TextStyle(color: AppTheme.inkMuted, fontFamily: 'JetBrains Mono', fontSize: 12, fontWeight: FontWeight.bold)),
          const SizedBox(width: 16),
          Expanded(
            child: DropdownButtonHideUnderline(
              child: DropdownButton<String>(
                isExpanded: true,
                dropdownColor: AppTheme.bgRaised,
                value: provider.selectedFaultType ?? 'All',
                icon: const Icon(Icons.arrow_drop_down, color: AppTheme.inkPrimary),
                style: const TextStyle(color: AppTheme.inkPrimary, fontFamily: 'Inter'),
                onChanged: (String? newValue) {
                  provider.setFaultTypeFilter(newValue);
                },
                items: provider.faultTypes.map<DropdownMenuItem<String>>((String value) {
                  return DropdownMenuItem<String>(
                    value: value,
                    child: Text(value),
                  );
                }).toList(),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecordCard(BuildContext context, Map<String, dynamic> record) {
    final faultTypeLabel = record['fault_type_label'] ?? record['fault_type'] ?? 'Unknown';
    final isHealthy = record['fault_type'] == 'NONE';
    final severityColor = isHealthy ? AppTheme.signalGreen : AppTheme.signalRed;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => RecordDetailScreen(recordId: record['record_id']),
            ),
          );
        },
        borderRadius: BorderRadius.circular(8),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    record['record_id'] ?? '',
                    style: const TextStyle(
                      fontFamily: 'JetBrains Mono',
                      color: AppTheme.inkMuted,
                      fontSize: 12,
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: severityColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(4),
                      border: Border.all(color: severityColor.withValues(alpha: 0.3)),
                    ),
                    child: Text(
                      faultTypeLabel.toUpperCase(),
                      style: TextStyle(
                        color: severityColor,
                        fontFamily: 'JetBrains Mono',
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  _buildMetric('FREQ', '${record['frequency_hz']} Hz'),
                  _buildMetric('V-UNBAL', '${record['voltage_unbalance_pct']}%'),
                  _buildMetric('I-UNBAL', '${record['current_unbalance_pct']}%'),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildMetric(String label, String value) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: AppTheme.inkMuted,
            fontSize: 10,
            fontWeight: FontWeight.bold,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: AppTheme.inkPrimary,
            fontFamily: 'Space Grotesk',
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}
