import 'package:flutter/material.dart';
import '../core/api_service.dart';

class AppStateProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  bool _isBackendOnline = false;
  bool get isBackendOnline => _isBackendOnline;

  List<dynamic> _records = [];
  List<dynamic> get records => _records;

  List<String> _faultTypes = [];
  List<String> get faultTypes => _faultTypes;

  String? _selectedFaultType;
  String? get selectedFaultType => _selectedFaultType;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  Future<void> checkHealth() async {
    try {
      await _apiService.checkHealth();
      _isBackendOnline = true;
    } catch (e) {
      _isBackendOnline = false;
    }
    notifyListeners();
  }

  void setFaultTypeFilter(String? faultType) {
    _selectedFaultType = faultType;
    fetchRecords();
  }

  Future<void> fetchRecords() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final data = await _apiService.getRecords(
        faultType: _selectedFaultType == 'All' ? null : _selectedFaultType,
        limit: 300,
      );
      _records = data['records'] ?? [];
      
      final rawFaultTypes = List<String>.from(data['fault_types'] ?? []);
      _faultTypes = ['All', ...rawFaultTypes];
      
      _isBackendOnline = true;
    } catch (e) {
      _errorMessage = e.toString();
      _isBackendOnline = false;
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
