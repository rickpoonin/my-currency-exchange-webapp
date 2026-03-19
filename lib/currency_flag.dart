import 'package:flutter/material.dart';
import 'package:my_flutter_web_app/currency_to_country_code.dart';

Widget currencyToFlag(String currencyCode, {double width = 24, double height = 18}) {
  final countryCode = currencyToCountryCode[currencyCode.toUpperCase()];
  if (countryCode == null) {
    return Icon(Icons.flag, size: width); // Default flag
  }

  final lowerCaseCode = countryCode.toLowerCase();
  // Using local assets downloaded from FlagCDN for offline support
  return Image.asset(
    'assets/flags/$lowerCaseCode.png',
    width: width,
    height: height,
    fit: BoxFit.cover,
    errorBuilder: (context, error, stackTrace) => Icon(Icons.flag, size: width),
  );
}
