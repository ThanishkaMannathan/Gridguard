import 'package:flutter/material.dart';

class AppTheme {
  // Color palette — matches the web app's Tailwind tokens exactly
  static const Color bgDeep = Color(0xFF0A0F1A);
  static const Color bgPanel = Color(0xFF111A2B);
  static const Color bgRaised = Color(0xFF17233A);
  static const Color bgHover = Color(0xFF1D2B45);

  static const Color borderDefault = Color(0xFF233049);
  static const Color borderSoft = Color(0xFF1B2740);

  static const Color inkPrimary = Color(0xFFE7EDF7);
  static const Color inkMuted = Color(0xFF8493B0);
  static const Color inkFaint = Color(0xFF5A6B8C);

  static const Color signalCyan = Color(0xFF2FD9D2);
  static const Color signalAmber = Color(0xFFF5A623);
  static const Color signalRed = Color(0xFFFF5470);
  static const Color signalGreen = Color(0xFF3ADC8C);
  static const Color signalViolet = Color(0xFF8B7CF6);

  // Monospace style for data labels
  static const TextStyle mono = TextStyle(
    fontFamily: 'monospace',
    color: signalCyan,
    letterSpacing: 0.5,
  );

  static ThemeData get darkTheme {
    return ThemeData(
      useMaterial3: true,
      brightness: Brightness.dark,
      primaryColor: signalCyan,
      scaffoldBackgroundColor: bgDeep,
      colorScheme: const ColorScheme.dark(
        primary: signalCyan,
        secondary: signalAmber,
        surface: bgPanel,
        error: signalRed,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: bgPanel,
        surfaceTintColor: Colors.transparent,
        elevation: 0,
        centerTitle: true,
        iconTheme: IconThemeData(color: inkPrimary),
        titleTextStyle: TextStyle(
          color: inkPrimary,
          fontSize: 18,
          fontWeight: FontWeight.w700,
          letterSpacing: 1.5,
        ),
      ),
      cardTheme: CardThemeData(
        color: bgPanel,
        elevation: 0,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(8),
          side: const BorderSide(color: borderDefault, width: 1),
        ),
        margin: EdgeInsets.zero,
      ),
      dividerTheme: const DividerThemeData(
        color: borderDefault,
        thickness: 1,
      ),
      textTheme: const TextTheme(
        displayLarge: TextStyle(color: inkPrimary),
        displayMedium: TextStyle(color: inkPrimary),
        displaySmall: TextStyle(color: inkPrimary),
        headlineLarge: TextStyle(color: inkPrimary, fontWeight: FontWeight.bold),
        headlineMedium: TextStyle(color: inkPrimary, fontWeight: FontWeight.bold),
        headlineSmall: TextStyle(color: inkPrimary, fontWeight: FontWeight.bold),
        titleLarge: TextStyle(color: inkPrimary, fontWeight: FontWeight.w600),
        titleMedium: TextStyle(color: inkPrimary, fontWeight: FontWeight.w600),
        titleSmall: TextStyle(color: inkPrimary, fontWeight: FontWeight.w500),
        bodyLarge: TextStyle(color: inkPrimary),
        bodyMedium: TextStyle(color: inkPrimary),
        bodySmall: TextStyle(color: inkMuted),
        labelLarge: TextStyle(color: inkPrimary, fontWeight: FontWeight.w600),
        labelMedium: TextStyle(color: inkPrimary),
        labelSmall: TextStyle(color: inkMuted),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: bgRaised,
          foregroundColor: signalCyan,
          side: const BorderSide(color: signalCyan, width: 1),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(6)),
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
        ),
      ),
      dropdownMenuTheme: const DropdownMenuThemeData(
        menuStyle: MenuStyle(
          backgroundColor: WidgetStatePropertyAll(bgRaised),
        ),
      ),
    );
  }
}
