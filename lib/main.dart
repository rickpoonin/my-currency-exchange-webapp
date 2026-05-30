import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:my_flutter_web_app/currency_flag.dart';
import 'package:provider/provider.dart';
import 'package:intl/intl.dart';
import 'dart:convert';
import 'dart:async';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  runApp(const MyApp());
}

class ThemeProvider with ChangeNotifier {
  ThemeMode _themeMode = ThemeMode.light;

  ThemeMode get themeMode => _themeMode;

  void toggleTheme() {
    _themeMode = _themeMode == ThemeMode.light ? ThemeMode.dark : ThemeMode.light;
    notifyListeners();
  }

  ThemeData get lightTheme => ThemeData(
        brightness: Brightness.light,
        primarySwatch: Colors.blue,
        appBarTheme: const AppBarTheme(
          backgroundColor: Colors.blue,
          foregroundColor: Colors.white,
        ),
        cardColor: Colors.white,
        scaffoldBackgroundColor: Colors.grey[100],
        textTheme: Typography.blackMountainView.apply(bodyColor: Colors.black),
        colorScheme: ColorScheme.fromSwatch(primarySwatch: Colors.blue).copyWith(secondary: Colors.blueAccent),
      );

  ThemeData get darkTheme => ThemeData(
        brightness: Brightness.dark,
        primarySwatch: Colors.indigo,
        appBarTheme: AppBarTheme(
          backgroundColor: Colors.grey[900],
          foregroundColor: Colors.white,
        ),
        cardColor: Colors.grey[800],
        scaffoldBackgroundColor: Colors.grey[900],
        textTheme: Typography.whiteMountainView.apply(bodyColor: Colors.white),
        colorScheme: ColorScheme.fromSwatch(primarySwatch: Colors.indigo, brightness: Brightness.dark)
            .copyWith(secondary: Colors.indigoAccent),
      );
}

class ConversionHistory {
  final String fromCurrency;
  final String toCurrency;
  final double fromAmount;
  final double toAmount;
  final DateTime timestamp;

  ConversionHistory({
    required this.fromCurrency,
    required this.toCurrency,
    required this.fromAmount,
    required this.toAmount,
    required this.timestamp,
  });

  // For serialization
  Map<String, dynamic> toJson() => {
        'fromCurrency': fromCurrency,
        'toCurrency': toCurrency,
        'fromAmount': fromAmount,
        'toAmount': toAmount,
        'timestamp': timestamp.toIso8601String(),
      };

  // For deserialization
  factory ConversionHistory.fromJson(Map<String, dynamic> json) => ConversionHistory(
        fromCurrency: json['fromCurrency'],
        toCurrency: json['toCurrency'],
        fromAmount: json['fromAmount'],
        toAmount: json['toAmount'],
        timestamp: DateTime.parse(json['timestamp']),
      );
}

class ExchangeRateProvider with ChangeNotifier {
  Map<String, double> _rates = {};
  bool _isLoading = false;
  String? _errorMessage;
  
  String _fromCurrency = 'USD';
  String _toCurrency = 'EUR';
  double _amount = 1.0;
  double? _convertedAmount;

  List<ConversionHistory> _history = [];
  
  Map<String, double> get rates => _rates;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;

  String get fromCurrency => _fromCurrency;
  String get toCurrency => _toCurrency;
  double get amount => _amount;
  double? get convertedAmount => _convertedAmount;
  List<ConversionHistory> get history => _history;
  
  DateTime? _lastFetchTime;
  DateTime? get lastFetchTime => _lastFetchTime;

  ExchangeRateProvider() {
    _loadState().then((_) {
      fetchExchangeRates();
    });
  }

  Future<void> setFromCurrency(String currency) async {
    _fromCurrency = currency;
    await _convertAndSave();
  }

  Future<void> setToCurrency(String currency) async {
    _toCurrency = currency;
    await _convertAndSave();
  }

  Future<void> setAmount(double newAmount) async {
    _amount = newAmount;
    await _convertAndSave();
  }

  Future<void> swapCurrencies() async {
    final temp = _fromCurrency;
    _fromCurrency = _toCurrency;
    _toCurrency = temp;
    await _convertAndSave();
  }

  Future<void> clearHistory() async {
    _history.clear();
    await _saveState();
    notifyListeners();
  }

  Future<void> removeHistoryItem(int index) async {
    if (index >= 0 && index < _history.length) {
      _history.removeAt(index);
      await _saveState();
      notifyListeners();
    }
  }

  Future<void> _convertAndSave({bool addToHistory = false}) async {
    if (_rates.isEmpty) {
      notifyListeners();
      return;
    }

    double fromRate = _rates[_fromCurrency] ?? 1.0;
    double toRate = _rates[_toCurrency] ?? 1.0;
    
    _convertedAmount = (_amount / fromRate) * toRate;

    if (addToHistory) {
      final newHistoryEntry = ConversionHistory(
        fromCurrency: _fromCurrency,
        toCurrency: _toCurrency,
        fromAmount: _amount,
        toAmount: _convertedAmount!,
        timestamp: DateTime.now(),
      );
      _history.insert(0, newHistoryEntry);
    }
    
    await _saveState();
    notifyListeners();
  }
  
  Future<void> performConversion() async {
    await _convertAndSave(addToHistory: true);
  }

  Future<void> _saveState() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('fromCurrency', _fromCurrency);
    await prefs.setString('toCurrency', _toCurrency);
    List<String> historyJson = _history.map((item) => jsonEncode(item.toJson())).toList();
    await prefs.setStringList('history', historyJson);
  }

  Future<void> _loadState() async {
    final prefs = await SharedPreferences.getInstance();
    _fromCurrency = prefs.getString('fromCurrency') ?? 'USD';
    _toCurrency = prefs.getString('toCurrency') ?? 'EUR';
    List<String> historyJson = prefs.getStringList('history') ?? [];
    _history = historyJson.map((item) => ConversionHistory.fromJson(jsonDecode(item))).toList();
    notifyListeners();
  }

  Future<void> fetchExchangeRates() async {
    _isLoading = true;
    _errorMessage = null;
    notifyListeners();

    try {
      final response = await http.get(Uri.parse('https://api.frankfurter.dev/v1/latest'));
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        _rates = (data['rates'] as Map<String, dynamic>).map((key, value) => MapEntry(key, value.toDouble()));
        _rates[data['base']] = 1.0; // Add base currency (EUR) to the rates map
        _lastFetchTime = DateTime.now();
        await _convertAndSave(); // Perform initial conversion with loaded/default state
      } else {
        _errorMessage = 'Failed to load exchange rates: ${response.statusCode}';
      }
    } catch (e) {
      _errorMessage = 'Error fetching exchange rates. Please check your connection and try again.';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => ThemeProvider()),
        ChangeNotifierProvider(create: (_) => ExchangeRateProvider()),
      ],
      child: Consumer<ThemeProvider>(
        builder: (context, themeProvider, child) {
          return MaterialApp(
            title: 'Exchange Rate App',
            theme: themeProvider.lightTheme,
            darkTheme: themeProvider.darkTheme,
            themeMode: themeProvider.themeMode,
            home: const HomePage(),
            debugShowCheckedModeBanner: false,
          );
        },
      ),
    );
  }
}

class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  late Timer _timer;
  String _currentTime = '';
  Timer? _debounce;
  late TextEditingController _amountController;

  @override
  void initState() {
    super.initState();
    final initialAmount = Provider.of<ExchangeRateProvider>(context, listen: false).amount;
    _amountController = TextEditingController(text: initialAmount.toString());
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _currentTime = DateFormat('yyyy-MM-dd HH:mm:ss').format(DateTime.now());
        });
      }
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    _debounce?.cancel();
    _amountController.dispose();
    super.dispose();
  }
  
  void _onAmountChanged(String value, ExchangeRateProvider provider) {
    if (_debounce?.isActive ?? false) _debounce!.cancel();
    _debounce = Timer(const Duration(milliseconds: 500), () {
      provider.setAmount(double.tryParse(value) ?? 0.0);
    });
  }

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);
    final exchangeRateProvider = Provider.of<ExchangeRateProvider>(context);

    return Scaffold(
      appBar: AppBar(
        title: const Text('Currency Converter'),
        actions: [
          Center(
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8.0),
              child: Text(_currentTime, style: const TextStyle(fontSize: 16)),
            ),
          ),
          IconButton(
            icon: Icon(
              themeProvider.themeMode == ThemeMode.dark ? Icons.dark_mode : Icons.light_mode,
              color: themeProvider.themeMode == ThemeMode.dark ? Colors.yellow : Colors.white,
            ),
            onPressed: () => themeProvider.toggleTheme(),
            tooltip: 'Toggle Theme',
          ),
        ],
      ),
      body: exchangeRateProvider.isLoading && exchangeRateProvider.rates.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : exchangeRateProvider.errorMessage != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(16.0),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.error_outline, color: Theme.of(context).colorScheme.error, size: 48),
                        const SizedBox(height: 16),
                        Text(
                          'Error: ${exchangeRateProvider.errorMessage}',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Theme.of(context).colorScheme.error),
                        ),
                        const SizedBox(height: 16),
                        ElevatedButton(
                          onPressed: () => exchangeRateProvider.fetchExchangeRates(),
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  ),
                )
              : RefreshIndicator(
                  onRefresh: () => exchangeRateProvider.fetchExchangeRates(),
                  child: ListView(
                    padding: const EdgeInsets.all(16.0),
                    children: [
                      _buildConverterCard(context, exchangeRateProvider),
                      const SizedBox(height: 20),
                      _buildHistoryPanel(context, exchangeRateProvider),
                      const SizedBox(height: 20),
                      _buildDisclaimer(context),
                    ],
                  ),
                ),
    );
  }

  Widget _buildDisclaimer(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 16.0),
      child: Text(
        'Disclaimer: All rates are for informational purposes only. Exchange rates are based on market data from frankfurter.dev and do not represent guaranteed rates from any financial institution.',
        textAlign: TextAlign.center,
        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey),
      ),
    );
  }

  Widget _buildConverterCard(BuildContext context, ExchangeRateProvider provider) {
    final currencyList = provider.rates.keys.toList()..sort();

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Currency Exchange', style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
            const SizedBox(height: 20),
            TextField(
              controller: _amountController,
              keyboardType: const TextInputType.numberWithOptions(decimal: true),
              decoration: const InputDecoration(
                labelText: 'Amount',
                border: OutlineInputBorder(),
              ),
              onChanged: (value) => _onAmountChanged(value, provider),
            ),
            const SizedBox(height: 16),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildCurrencyDropdown(context, 'From', provider.fromCurrency, currencyList, (value) {
                  if (value != null) provider.setFromCurrency(value);
                }),
                IconButton(
                  icon: Icon(Icons.swap_horiz, color: Theme.of(context).colorScheme.primary, size: 30),
                  onPressed: () => provider.swapCurrencies(),
                ),
                _buildCurrencyDropdown(context, 'To', provider.toCurrency, currencyList, (value) {
                  if (value != null) provider.setToCurrency(value);
                }),
              ],
            ),
            const SizedBox(height: 20),
            if (provider.convertedAmount != null)
              Center(
                child: Column(
                  children: [
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('${provider.amount} ', style: Theme.of(context).textTheme.titleMedium),
                    currencyToFlag(provider.fromCurrency),
                    Text(' ${provider.fromCurrency} =', style: Theme.of(context).textTheme.titleMedium),
                  ],
                    ),
                    const SizedBox(height: 4),
                Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text('${provider.convertedAmount!.toStringAsFixed(4)} ', style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary
                    )),
                    currencyToFlag(provider.toCurrency, width: 32, height: 24),
                    Text(' ${provider.toCurrency}', style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: Theme.of(context).colorScheme.primary
                    )),
                  ],
                    ),
                    const SizedBox(height: 10),
                    ElevatedButton.icon(
                      icon: const Icon(Icons.history),
                      label: const Text('Add to History'),
                      onPressed: () => provider.performConversion(),
                    )
                  ],
                ),
              ),
            const SizedBox(height: 16),
            _buildRateTimer(context, provider),
          ],
        ),
      ),
    );
  }

  Widget _buildCurrencyDropdown(BuildContext context, String label, String value, List<String> items, ValueChanged<String?> onChanged) {
    if (items.isEmpty) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(label, style: Theme.of(context).textTheme.labelLarge),
          const SizedBox(height: 4),
          DropdownButton<String>(
            value: null,
            underline: const SizedBox(),
            isExpanded: true,
            onChanged: (_) {},
            hint: const Text('Loading...'),
            items: const [],
          ),
        ],
      );
    }
    final dropdownValue = items.contains(value) ? value : items.first;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: Theme.of(context).textTheme.labelLarge),
        const SizedBox(height: 4),
        DropdownButton<String>(
          value: dropdownValue,
          underline: Container(
            height: 1,
            color: Theme.of(context).colorScheme.primary,
          ),
          onChanged: onChanged,
          items: items.map<DropdownMenuItem<String>>((String currency) {
            return DropdownMenuItem<String>(
              value: currency,
              child: Row(
                children: [
                  Text(currency, style: const TextStyle(fontWeight: FontWeight.bold)),
                  const SizedBox(width: 8),
                  currencyToFlag(currency, width: 24, height: 18),
                ],
              ),
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildRateTimer(BuildContext context, ExchangeRateProvider provider) {
    if (provider.lastFetchTime == null) return const SizedBox.shrink();

    final now = DateTime.now();
    final diff = now.difference(provider.lastFetchTime!);
    final remaining = const Duration(minutes: 15) - diff;

    if (remaining.isNegative) {
      return Center(
        child: Column(
          children: [
            Text('Exchange rates have expired.', style: TextStyle(color: Theme.of(context).colorScheme.error)),
            const SizedBox(height: 8),
            ElevatedButton.icon(
              onPressed: () => provider.fetchExchangeRates(),
              icon: const Icon(Icons.refresh),
              label: const Text('Refresh Rates'),
            ),
          ],
        ),
      );
    }

    final minutes = remaining.inMinutes.toString().padLeft(2, '0');
    final seconds = (remaining.inSeconds % 60).toString().padLeft(2, '0');

    return Center(
      child: Text(
        'Rates expire in $minutes:$seconds',
        style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey),
      ),
    );
  }

  Widget _buildHistoryPanel(BuildContext context, ExchangeRateProvider provider) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
             Text(
              'History',
              style: Theme.of(context).textTheme.titleLarge?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
            ),
            if (provider.history.isNotEmpty)
              TextButton(
                child: const Text('Clear History'),
                onPressed: () => provider.clearHistory(),
              )
          ],
        ),
        const SizedBox(height: 10),
        provider.history.isEmpty
            ? const Center(child: Text('No conversion history yet.'))
            : ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: provider.history.length > 10 ? 10 : provider.history.length, // Limit history display
                itemBuilder: (context, index) {
                  final item = provider.history[index];
                  return Card(
                    margin: const EdgeInsets.symmetric(vertical: 4),
                    child: ListTile(
                      leading: CircleAvatar(child: Text((index + 1).toString())),
                    title: Wrap(
                      crossAxisAlignment: WrapCrossAlignment.center,
                      children: [
                        Text('${item.fromAmount} ', style: const TextStyle(fontWeight: FontWeight.bold)),
                        currencyToFlag(item.fromCurrency, width: 20, height: 15),
                        Text(' ${item.fromCurrency} → ${item.toAmount.toStringAsFixed(4)} ', style: const TextStyle(fontWeight: FontWeight.bold)),
                        currencyToFlag(item.toCurrency, width: 20, height: 15),
                        Text(' ${item.toCurrency}', style: const TextStyle(fontWeight: FontWeight.bold)),
                      ],
                      ),
                      subtitle: Text(DateFormat('yyyy-MM-dd HH:mm').format(item.timestamp)),
                      trailing: IconButton(
                        icon: const Icon(Icons.delete_outline),
                        color: Theme.of(context).colorScheme.error,
                        onPressed: () => provider.removeHistoryItem(index),
                        tooltip: 'Delete record',
                      ),
                    ),
                  );
                },
              ),
      ],
    );
  }
}
