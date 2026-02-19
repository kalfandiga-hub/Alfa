import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  Dimensions,
  StatusBar
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LineChart, BarChart } from 'react-native-chart-kit';

const screenWidth = Dimensions.get('window').width;

export default function App() {
  const [transactions, setTransactions] = useState([]);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('entrada');
  const [loading, setLoading] = useState(true);

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  // Salvar dados automaticamente
  useEffect(() => {
    if (!loading) {
      saveData();
    }
  }, [transactions]);

  const loadData = async () => {
    try {
      const data = await AsyncStorage.getItem('financial-transactions');
      if (data) {
        setTransactions(JSON.parse(data));
      }
    } catch (error) {
      console.log('Erro ao carregar dados:', error);
    }
    setLoading(false);
  };

  const saveData = async () => {
    try {
      await AsyncStorage.setItem('financial-transactions', JSON.stringify(transactions));
    } catch (error) {
      console.log('Erro ao salvar dados:', error);
    }
  };

  const addTransaction = () => {
    if (!description.trim() || !amount || parseFloat(amount) <= 0) {
      Alert.alert('Erro', 'Preencha a descrição e um valor válido');
      return;
    }

    const newTransaction = {
      id: Date.now(),
      description: description.trim(),
      amount: parseFloat(amount),
      type,
      date: new Date().toISOString()
    };

    setTransactions([newTransaction, ...transactions]);
    setDescription('');
    setAmount('');
    Alert.alert('Sucesso', 'Transação adicionada!');
  };

  const deleteTransaction = (id) => {
    Alert.alert(
      'Confirmar',
      'Deseja realmente excluir esta transação?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: () => setTransactions(transactions.filter(t => t.id !== id))
        }
      ]
    );
  };

  // Calcular saldo total
  const calculateBalance = () => {
    return transactions.reduce((acc, t) => {
      return t.type === 'entrada' ? acc + t.amount : acc - t.amount;
    }, 0);
  };

  // Calcular totais do mês atual
  const calculateMonthTotals = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const monthTransactions = transactions.filter(t => {
      const tDate = new Date(t.date);
      return tDate.getMonth() === currentMonth && tDate.getFullYear() === currentYear;
    });

    const income = monthTransactions
      .filter(t => t.type === 'entrada')
      .reduce((acc, t) => acc + t.amount, 0);

    const expenses = monthTransactions
      .filter(t => t.type === 'saida')
      .reduce((acc, t) => acc + t.amount, 0);

    return { income, expenses, balance: income - expenses };
  };

  // Preparar dados para gráficos
  const getMonthlyData = () => {
    const monthsData = [];
    const now = new Date();

    // Últimos 6 meses
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const monthName = date.toLocaleDateString('pt-BR', { month: 'short' });
      
      monthsData.push({
        key: monthKey,
        month: monthName.charAt(0).toUpperCase() + monthName.slice(1, 3),
        entradas: 0,
        saidas: 0,
        saldo: 0
      });
    }

    // Processar transações
    transactions.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      const monthIndex = monthsData.findIndex(m => m.key === monthKey);
      if (monthIndex !== -1) {
        if (t.type === 'entrada') {
          monthsData[monthIndex].entradas += t.amount;
        } else {
          monthsData[monthIndex].saidas += t.amount;
        }
      }
    });

    // Calcular saldo acumulado
    let accumulated = 0;
    monthsData.forEach(month => {
      accumulated += month.entradas - month.saidas;
      month.saldo = accumulated;
    });

    return monthsData;
  };

  const balance = calculateBalance();
  const monthTotals = calculateMonthTotals();
  const monthlyData = getMonthlyData();

  const formatCurrency = (value) => {
    return value.toLocaleString('pt-MZ', {
      style: 'currency',
      currency: 'MZN'
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Carregando...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1e40af" />
      <ScrollView style={styles.scrollView}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Controle Financeiro</Text>
          <Text style={styles.headerSubtitle}>Gerencie seu patrimônio</Text>
        </View>

        {/* Cards de Resumo */}
        <View style={styles.cardsContainer}>
          {/* Patrimônio Total */}
          <View style={[styles.card, balance >= 0 ? styles.cardGreen : styles.cardRed]}>
            <Text style={styles.cardLabel}>Patrimônio Total</Text>
            <Text style={[styles.cardValue, balance >= 0 ? styles.textGreen : styles.textRed]}>
              {formatCurrency(balance)}
            </Text>
          </View>

          {/* Entradas do Mês */}
          <View style={[styles.card, styles.cardBlue]}>
            <Text style={styles.cardLabel}>Entradas do Mês</Text>
            <Text style={[styles.cardValue, styles.textBlue]}>
              {formatCurrency(monthTotals.income)}
            </Text>
          </View>

          {/* Saídas do Mês */}
          <View style={[styles.card, styles.cardOrange]}>
            <Text style={styles.cardLabel}>Saídas do Mês</Text>
            <Text style={[styles.cardValue, styles.textOrange]}>
              {formatCurrency(monthTotals.expenses)}
            </Text>
          </View>

          {/* Saldo do Mês */}
          <View style={[styles.card, monthTotals.balance >= 0 ? styles.cardGreen : styles.cardRed]}>
            <Text style={styles.cardLabel}>Saldo do Mês</Text>
            <Text style={[styles.cardValue, monthTotals.balance >= 0 ? styles.textGreen : styles.textRed]}>
              {formatCurrency(monthTotals.balance)}
            </Text>
          </View>
        </View>

        {/* Gráfico de Evolução */}
        {transactions.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>📈 Evolução do Patrimônio</Text>
            <LineChart
              data={{
                labels: monthlyData.map(m => m.month),
                datasets: [{
                  data: monthlyData.map(m => m.saldo)
                }]
              }}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#1e40af',
                backgroundGradientFrom: '#3b82f6',
                backgroundGradientTo: '#1e40af',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: { borderRadius: 16 },
                propsForDots: {
                  r: '6',
                  strokeWidth: '2',
                  stroke: '#ffa726'
                }
              }}
              bezier
              style={styles.chart}
            />
          </View>
        )}

        {/* Gráfico de Barras */}
        {transactions.length > 0 && (
          <View style={styles.chartContainer}>
            <Text style={styles.chartTitle}>📊 Entradas vs Saídas</Text>
            <BarChart
              data={{
                labels: monthlyData.map(m => m.month),
                datasets: [
                  {
                    data: monthlyData.map(m => m.entradas),
                    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`
                  },
                  {
                    data: monthlyData.map(m => m.saidas),
                    color: (opacity = 1) => `rgba(249, 115, 22, ${opacity})`
                  }
                ]
              }}
              width={screenWidth - 40}
              height={220}
              chartConfig={{
                backgroundColor: '#059669',
                backgroundGradientFrom: '#10b981',
                backgroundGradientTo: '#059669',
                decimalPlaces: 0,
                color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                style: { borderRadius: 16 }
              }}
              style={styles.chart}
            />
          </View>
        )}

        {/* Formulário */}
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>Adicionar Transação</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Descrição"
            value={description}
            onChangeText={setDescription}
            placeholderTextColor="#9ca3af"
          />

          <TextInput
            style={styles.input}
            placeholder="Valor"
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            placeholderTextColor="#9ca3af"
          />

          <View style={styles.typeButtons}>
            <TouchableOpacity
              style={[styles.typeButton, type === 'entrada' && styles.typeButtonActive]}
              onPress={() => setType('entrada')}
            >
              <Text style={[styles.typeButtonText, type === 'entrada' && styles.typeButtonTextActive]}>
                ➕ Entrada
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.typeButton, type === 'saida' && styles.typeButtonActiveRed]}
              onPress={() => setType('saida')}
            >
              <Text style={[styles.typeButtonText, type === 'saida' && styles.typeButtonTextActive]}>
                ➖ Saída
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.addButton, type === 'entrada' ? styles.addButtonGreen : styles.addButtonRed]}
            onPress={addTransaction}
          >
            <Text style={styles.addButtonText}>Adicionar</Text>
          </TouchableOpacity>
        </View>

        {/* Lista de Transações */}
        <View style={styles.transactionsContainer}>
          <Text style={styles.transactionsTitle}>Histórico de Transações</Text>
          
          {transactions.length === 0 ? (
            <Text style={styles.emptyText}>Nenhuma transação registrada</Text>
          ) : (
            transactions.map((transaction) => (
              <View
                key={transaction.id}
                style={[
                  styles.transactionItem,
                  transaction.type === 'entrada' ? styles.transactionGreen : styles.transactionRed
                ]}
              >
                <View style={styles.transactionInfo}>
                  <Text style={styles.transactionDescription}>
                    {transaction.type === 'entrada' ? '➕' : '➖'} {transaction.description}
                  </Text>
                  <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
                </View>
                <View style={styles.transactionRight}>
                  <Text style={[
                    styles.transactionAmount,
                    transaction.type === 'entrada' ? styles.textGreen : styles.textRed
                  ]}>
                    {transaction.type === 'entrada' ? '+' : '-'} {formatCurrency(transaction.amount)}
                  </Text>
                  <TouchableOpacity
                    onPress={() => deleteTransaction(transaction.id)}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0f9ff',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#6b7280',
  },
  header: {
    backgroundColor: '#1e40af',
    padding: 24,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#bfdbfe',
  },
  cardsContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardGreen: {
    borderLeftColor: '#10b981',
  },
  cardRed: {
    borderLeftColor: '#ef4444',
  },
  cardBlue: {
    borderLeftColor: '#3b82f6',
  },
  cardOrange: {
    borderLeftColor: '#f97316',
  },
  cardLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
    fontWeight: '600',
  },
  cardValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  textGreen: {
    color: '#10b981',
  },
  textRed: {
    color: '#ef4444',
  },
  textBlue: {
    color: '#3b82f6',
  },
  textOrange: {
    color: '#f97316',
  },
  chartContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  formContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    fontSize: 16,
    backgroundColor: '#ffffff',
    color: '#1f2937',
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  typeButtonActive: {
    backgroundColor: '#10b981',
    borderColor: '#10b981',
  },
  typeButtonActiveRed: {
    backgroundColor: '#ef4444',
    borderColor: '#ef4444',
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  typeButtonTextActive: {
    color: '#ffffff',
  },
  addButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonGreen: {
    backgroundColor: '#10b981',
  },
  addButtonRed: {
    backgroundColor: '#ef4444',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  transactionsContainer: {
    backgroundColor: '#ffffff',
    margin: 16,
    marginBottom: 32,
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  transactionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  emptyText: {
    textAlign: 'center',
    color: '#9ca3af',
    padding: 24,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  transactionGreen: {
    backgroundColor: '#f0fdf4',
    borderLeftColor: '#10b981',
  },
  transactionRed: {
    backgroundColor: '#fef2f2',
    borderLeftColor: '#ef4444',
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#6b7280',
  },
  transactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    color: '#ef4444',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
