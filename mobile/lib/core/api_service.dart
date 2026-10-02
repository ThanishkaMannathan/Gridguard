import 'dart:convert';
import 'dart:async';
import 'package:http/http.dart' as http;
import 'package:flutter_dotenv/flutter_dotenv.dart';

/// Central API client for the GridGuard Flask backend.
/// Configure the base URL via the .env file: API_BASE_URL=http://10.0.2.2:5000
class ApiService {
  String get baseUrl {
    final url = dotenv.maybeGet('API_BASE_URL') ?? 'http://10.0.2.2:5000';
    // Strip trailing slash
    return url.endsWith('/') ? url.substring(0, url.length - 1) : url;
  }

  // Shared HTTP client (reuses connections)
  final _client = http.Client();

  Map<String, String> get _headers => {'Content-Type': 'application/json'};

  /// Throw a readable exception from an HTTP error response.
  Never _throwHttpError(http.Response res) {
    String message;
    try {
      final body = json.decode(res.body) as Map<String, dynamic>;
      message = body['error']?.toString() ?? 'Request failed (${res.statusCode})';
    } catch (_) {
      message = 'Request failed (${res.statusCode})';
    }
    throw Exception(message);
  }

  // GET /api/health
  Future<Map<String, dynamic>> checkHealth() async {
    try {
      final res = await _client
          .get(Uri.parse('$baseUrl/api/health'), headers: _headers)
          .timeout(const Duration(seconds: 5));
      if (res.statusCode == 200) return json.decode(res.body) as Map<String, dynamic>;
      _throwHttpError(res);
    } on TimeoutException {
      throw Exception('Backend unreachable (timeout)');
    }
  }

  // GET /api/records?fault_type=&limit=&offset=
  Future<Map<String, dynamic>> getRecords({
    String? faultType,
    int limit = 300,
    int offset = 0,
  }) async {
    final queryParams = <String, String>{
      'limit': '$limit',
      'offset': '$offset',
    };
    if (faultType != null && faultType.isNotEmpty) {
      queryParams['fault_type'] = faultType;
    }
    final uri = Uri.parse('$baseUrl/api/records').replace(queryParameters: queryParams);
    try {
      final res = await _client.get(uri, headers: _headers).timeout(const Duration(seconds: 15));
      if (res.statusCode == 200) return json.decode(res.body) as Map<String, dynamic>;
      _throwHttpError(res);
    } on TimeoutException {
      throw Exception('Request timed out while loading records');
    }
  }

  // GET /api/records/<record_id>
  Future<Map<String, dynamic>> getRecordDetail(String recordId) async {
    try {
      final res = await _client
          .get(Uri.parse('$baseUrl/api/records/$recordId'), headers: _headers)
          .timeout(const Duration(seconds: 15));
      if (res.statusCode == 200) return json.decode(res.body) as Map<String, dynamic>;
      _throwHttpError(res);
    } on TimeoutException {
      throw Exception('Request timed out while loading record detail');
    }
  }

  // POST /api/classify/<record_id>
  Future<Map<String, dynamic>> classifyRecord(String recordId) async {
    try {
      final res = await _client
          .post(Uri.parse('$baseUrl/api/classify/$recordId'), headers: _headers)
          .timeout(const Duration(seconds: 30));
      if (res.statusCode == 200) return json.decode(res.body) as Map<String, dynamic>;
      _throwHttpError(res);
    } on TimeoutException {
      throw Exception('Classifier request timed out');
    }
  }

  // POST /api/diagnose/<record_id>
  Future<Map<String, dynamic>> diagnoseRecord(String recordId) async {
    try {
      final res = await _client
          .post(Uri.parse('$baseUrl/api/diagnose/$recordId'), headers: _headers)
          .timeout(const Duration(seconds: 90));
      if (res.statusCode == 200) return json.decode(res.body) as Map<String, dynamic>;
      _throwHttpError(res);
    } on TimeoutException {
      throw Exception('AI diagnosis timed out — try again');
    }
  }

  // GET or POST /api/report/<record_id>?format=json
  Future<Map<String, dynamic>> getReportJson(
    String recordId, {
    Map<String, dynamic>? diagnosisData,
  }) async {
    final uri = Uri.parse('$baseUrl/api/report/$recordId');
    try {
      http.Response res;
      if (diagnosisData != null) {
        res = await _client
            .post(uri, headers: _headers, body: json.encode(diagnosisData))
            .timeout(const Duration(seconds: 90));
      } else {
        res = await _client.get(uri, headers: _headers).timeout(const Duration(seconds: 90));
      }
      if (res.statusCode == 200) return json.decode(res.body) as Map<String, dynamic>;
      _throwHttpError(res);
    } on TimeoutException {
      throw Exception('Report generation timed out');
    }
  }

  // GET or POST /api/report/<record_id>?format=pdf  → raw bytes
  Future<List<int>> getReportPdfBytes(
    String recordId, {
    Map<String, dynamic>? diagnosisData,
  }) async {
    final uri = Uri.parse('$baseUrl/api/report/$recordId?format=pdf');
    try {
      http.Response res;
      if (diagnosisData != null) {
        res = await _client
            .post(uri, headers: _headers, body: json.encode(diagnosisData))
            .timeout(const Duration(seconds: 90));
      } else {
        res = await _client.get(uri, headers: _headers).timeout(const Duration(seconds: 90));
      }
      if (res.statusCode == 200) return res.bodyBytes;
      _throwHttpError(res);
    } on TimeoutException {
      throw Exception('PDF download timed out');
    }
  }

  void dispose() => _client.close();
}
