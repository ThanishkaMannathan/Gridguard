import 'package:flutter/material.dart';
import '../core/api_service.dart';

class RecordDetailProvider extends ChangeNotifier {
  final ApiService _apiService = ApiService();
  
  Map<String, dynamic>? _record;
  Map<String, dynamic>? get record => _record;

  bool _isLoading = false;
  bool get isLoading => _isLoading;

  String? _errorMessage;
  String? get errorMessage => _errorMessage;

  // Classification state
  Map<String, dynamic>? _classificationResult;
  Map<String, dynamic>? get classificationResult => _classificationResult;
  bool _isClassifying = false;
  bool get isClassifying => _isClassifying;
  String? _classificationError;
  String? get classificationError => _classificationError;

  // Diagnosis state
  Map<String, dynamic>? _diagnosisResult;
  Map<String, dynamic>? get diagnosisResult => _diagnosisResult;
  bool _isDiagnosing = false;
  bool get isDiagnosing => _isDiagnosing;
  String? _diagnosisError;
  String? get diagnosisError => _diagnosisError;

  Future<void> fetchRecordDetail(String recordId) async {
    _isLoading = true;
    _errorMessage = null;
    _record = null;
    _classificationResult = null;
    _diagnosisResult = null;
    notifyListeners();

    try {
      _record = await _apiService.getRecordDetail(recordId);
    } catch (e) {
      _errorMessage = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> classifyRecord(String recordId) async {
    _isClassifying = true;
    _classificationError = null;
    notifyListeners();

    try {
      _classificationResult = await _apiService.classifyRecord(recordId);
    } catch (e) {
      _classificationError = e.toString();
    } finally {
      _isClassifying = false;
      notifyListeners();
    }
  }

  Future<void> diagnoseRecord(String recordId) async {
    _isDiagnosing = true;
    _diagnosisError = null;
    notifyListeners();

    try {
      _diagnosisResult = await _apiService.diagnoseRecord(recordId);
    } catch (e) {
      _diagnosisError = e.toString();
    } finally {
      _isDiagnosing = false;
      notifyListeners();
    }
  }
}
