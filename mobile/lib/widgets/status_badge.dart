import 'package:flutter/material.dart';
import '../core/theme.dart';

class StatusBadge extends StatelessWidget {
  final bool isOnline;

  const StatusBadge({Key? key, required this.isOnline}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: AppTheme.bgRaised,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.borderDefault),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 8,
            height: 8,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: isOnline ? AppTheme.signalGreen : AppTheme.signalRed,
              boxShadow: [
                BoxShadow(
                  color: (isOnline ? AppTheme.signalGreen : AppTheme.signalRed).withValues(alpha: 0.5),
                  blurRadius: 6,
                  spreadRadius: 1,
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          Text(
            isOnline ? 'BACKEND ONLINE' : 'BACKEND OFFLINE',
            style: const TextStyle(
              fontFamily: 'JetBrains Mono',
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: AppTheme.inkPrimary,
              letterSpacing: 1.0,
            ),
          ),
        ],
      ),
    );
  }
}
