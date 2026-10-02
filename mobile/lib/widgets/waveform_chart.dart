import 'package:flutter/material.dart';
import 'package:fl_chart/fl_chart.dart';
import '../core/theme.dart';

class WaveformChart extends StatelessWidget {
  final String title;
  final List<dynamic> time;
  final List<dynamic> phaseA;
  final List<dynamic> phaseB;
  final List<dynamic> phaseC;
  final double maxY;
  final double minY;

  const WaveformChart({
    Key? key,
    required this.title,
    required this.time,
    required this.phaseA,
    required this.phaseB,
    required this.phaseC,
    required this.maxY,
    required this.minY,
  }) : super(key: key);

  @override
  Widget build(BuildContext context) {
    if (time.isEmpty) return const SizedBox();

    final pointsA = <FlSpot>[];
    final pointsB = <FlSpot>[];
    final pointsC = <FlSpot>[];

    // Downsample if too many points for performance
    int step = time.length > 1000 ? (time.length / 500).ceil() : 1;
    
    for (int i = 0; i < time.length; i += step) {
      double t = (time[i] as num).toDouble() * 1000; // convert to ms
      pointsA.add(FlSpot(t, (phaseA[i] as num).toDouble()));
      pointsB.add(FlSpot(t, (phaseB[i] as num).toDouble()));
      pointsC.add(FlSpot(t, (phaseC[i] as num).toDouble()));
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(bottom: 12.0),
          child: Text(
            title,
            style: const TextStyle(
              fontFamily: 'Space Grotesk',
              fontSize: 16,
              fontWeight: FontWeight.w600,
              color: AppTheme.inkPrimary,
            ),
          ),
        ),
        SizedBox(
          height: 200,
          child: LineChart(
            LineChartData(
              lineTouchData: const LineTouchData(enabled: false),
              gridData: FlGridData(
                show: true,
                drawVerticalLine: true,
                getDrawingHorizontalLine: (value) => const FlLine(color: AppTheme.borderDefault, strokeWidth: 1),
                getDrawingVerticalLine: (value) => const FlLine(color: AppTheme.borderDefault, strokeWidth: 1),
              ),
              titlesData: FlTitlesData(
                show: true,
                rightTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                topTitles: const AxisTitles(sideTitles: SideTitles(showTitles: false)),
                bottomTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 22,
                    getTitlesWidget: (value, meta) {
                      return Padding(
                        padding: const EdgeInsets.only(top: 8.0),
                        child: Text(
                          value.toStringAsFixed(0),
                          style: const TextStyle(color: AppTheme.inkMuted, fontSize: 10, fontFamily: 'JetBrains Mono'),
                        ),
                      );
                    },
                  ),
                ),
                leftTitles: AxisTitles(
                  sideTitles: SideTitles(
                    showTitles: true,
                    reservedSize: 40,
                    getTitlesWidget: (value, meta) {
                      return Text(
                        value.toStringAsFixed(0),
                        style: const TextStyle(color: AppTheme.inkMuted, fontSize: 10, fontFamily: 'JetBrains Mono'),
                        textAlign: TextAlign.right,
                      );
                    },
                  ),
                ),
              ),
              borderData: FlBorderData(show: true, border: Border.all(color: AppTheme.borderDefault, width: 1)),
              minX: pointsA.first.x,
              maxX: pointsA.last.x,
              minY: minY * 1.2, // Add some padding
              maxY: maxY * 1.2,
              lineBarsData: [
                LineChartBarData(
                  spots: pointsA,
                  isCurved: true,
                  color: AppTheme.signalCyan,
                  barWidth: 1.5,
                  isStrokeCapRound: true,
                  dotData: const FlDotData(show: false),
                ),
                LineChartBarData(
                  spots: pointsB,
                  isCurved: true,
                  color: AppTheme.signalAmber,
                  barWidth: 1.5,
                  isStrokeCapRound: true,
                  dotData: const FlDotData(show: false),
                ),
                LineChartBarData(
                  spots: pointsC,
                  isCurved: true,
                  color: AppTheme.signalRed,
                  barWidth: 1.5,
                  isStrokeCapRound: true,
                  dotData: const FlDotData(show: false),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            _buildLegendItem('Phase A', AppTheme.signalCyan),
            const SizedBox(width: 16),
            _buildLegendItem('Phase B', AppTheme.signalAmber),
            const SizedBox(width: 16),
            _buildLegendItem('Phase C', AppTheme.signalRed),
          ],
        )
      ],
    );
  }

  Widget _buildLegendItem(String label, Color color) {
    return Row(
      children: [
        Container(width: 12, height: 2, color: color),
        const SizedBox(width: 4),
        Text(label, style: const TextStyle(color: AppTheme.inkMuted, fontSize: 12)),
      ],
    );
  }
}
