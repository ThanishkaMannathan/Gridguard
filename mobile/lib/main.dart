import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:flutter_dotenv/flutter_dotenv.dart';
import 'providers/app_state_provider.dart';
import 'core/theme.dart';
import 'screens/record_list_screen.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await dotenv.load(fileName: ".env");
  } catch (e) {
    // If .env is missing, it will fall back to default in ApiService
  }
  
  runApp(const GridGuardApp());
}

class GridGuardApp extends StatelessWidget {
  const GridGuardApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AppStateProvider()),
      ],
      child: MaterialApp(
        title: 'GridGuard Mobile',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.darkTheme,
        home: const RecordListScreen(),
      ),
    );
  }
}
